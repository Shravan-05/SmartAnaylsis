/**
 * Date filtering, timezone conversion, and aggregation grouping utilities.
 * Supports UTC storage and Asia/Kolkata (or configured IANA timezone) display,
 * half-open date intervals [start, end), zero-filled chart intervals,
 * and robust timestamp / URL normalization.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validate IANA timezone or fallback to default.
 */
export function sanitizeTimezone(tz) {
  if (!tz || typeof tz !== 'string') return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Extract zoned calendar parts for a given Date in a specific IANA timezone.
 */
export function getZonedParts(date, timeZone = DEFAULT_TIMEZONE) {
  const safeTz = sanitizeTimezone(timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const map = {};
  for (const p of formatter.formatToParts(date)) {
    map[p.type] = p.value;
  }
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10), // 1 - 12
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour === '24' ? '0' : map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Convert calendar year, month, day, hour, minute, second in a specific timezone to a UTC Date.
 */
export function zonedToUtc(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0, timeZone = DEFAULT_TIMEZONE) {
  const safeTz = sanitizeTimezone(timeZone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const parts = getZonedParts(utcGuess, safeTz);
  const diffMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcGuess.getTime();
  return new Date(utcGuess.getTime() - diffMs);
}

/**
 * Parse arbitrary timestamp values safely.
 * Handles ISO-8601 strings, Date objects, Unix seconds (10-digit), and Unix milliseconds (13-digit).
 */
export function parseTimestamp(raw) {
  if (!raw && raw !== 0) return new Date();
  if (raw instanceof Date) return isNaN(raw.getTime()) ? new Date() : raw;

  // If number or numeric string (e.g. 1791782400 or 1791782400000)
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw.trim()))) {
    const num = Number(raw);
    // Unix seconds (<= 11 digits, typically 10 digits e.g. 1791782400)
    if (num < 100000000000) {
      return new Date(num * 1000);
    }
    // Unix milliseconds (13 digits)
    return new Date(num);
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Normalize page URLs:
 * - Strips trailing slash on path (unless root '/')
 * - Strips hash anchors (#section)
 * - Preserves search query parameters (?param=value)
 */
export function normalizeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr);
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return urlStr.trim().split('#')[0].replace(/\/+$/, '');
  }
}

/**
 * Resolve filter dates into a half-open MongoDB interval [start, end)
 * with start inclusive ($gte) and end exclusive ($lt).
 */
export function resolveDateRange({ time_range = 'all', startDate, endDate, timezone = DEFAULT_TIMEZONE } = {}) {
  const safeTz = sanitizeTimezone(timezone);
  const rangeKey = String(time_range || 'all').trim().toLowerCase();
  const now = new Date();
  const currentZoned = getZonedParts(now, safeTz);

  // Custom date range
  if (rangeKey === 'custom' || (startDate && endDate)) {
    if (!startDate || !endDate) {
      return {
        isValid: false,
        error: 'Both startDate and endDate are required for custom date range.',
      };
    }

    let start;
    let end;

    // If format is YYYY-MM-DD
    if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      const [y, m, d] = startDate.trim().split('-').map(Number);
      start = zonedToUtc(y, m, d, 0, 0, 0, 0, safeTz);
    } else {
      start = parseTimestamp(startDate);
    }

    if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      const [y, m, d] = endDate.trim().split('-').map(Number);
      // Half-open: end date + 1 day at 00:00:00.000 so the entire endDate is included
      end = zonedToUtc(y, m, d + 1, 0, 0, 0, 0, safeTz);
    } else {
      end = parseTimestamp(endDate);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        isValid: false,
        error: 'Invalid custom date format. Expected ISO-8601 strings or YYYY-MM-DD.',
      };
    }

    if (start >= end) {
      return {
        isValid: false,
        error: 'Start date must be before end date.',
      };
    }

    return {
      isValid: true,
      rangeKey: 'custom',
      start,
      end,
      mongoFilter: { $gte: start, $lt: end },
      timezone: safeTz,
    };
  }

  let start = null;
  let end = null;

  switch (rangeKey) {
    case 'today': {
      // Midnight today to midnight tomorrow in safeTz
      start = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day + 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'yesterday': {
      // Midnight yesterday to midnight today in safeTz
      start = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day - 1, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day, 0, 0, 0, 0, safeTz);
      break;
    }
    case '24h': {
      // Rolling 24 hours prior to now
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      end = now;
      break;
    }
    case '7d':
    case 'last_7_days': {
      // 7 calendar days ending at end of today
      start = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day - 6, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day + 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case '30d':
    case 'last_30_days': {
      // 30 calendar days ending at end of today
      start = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day - 29, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month, currentZoned.day + 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'this_month':
    case 'monthly': {
      // 1st of this month to 1st of next month
      start = zonedToUtc(currentZoned.year, currentZoned.month, 1, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month + 1, 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'last_month': {
      // 1st of last month to 1st of this month
      start = zonedToUtc(currentZoned.year, currentZoned.month - 1, 1, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, currentZoned.month, 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'this_year':
    case 'yearly': {
      // Jan 1 of this year to Jan 1 of next year
      start = zonedToUtc(currentZoned.year, 1, 1, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year + 1, 1, 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'last_year': {
      // Jan 1 of last year to Jan 1 of this year
      start = zonedToUtc(currentZoned.year - 1, 1, 1, 0, 0, 0, 0, safeTz);
      end = zonedToUtc(currentZoned.year, 1, 1, 0, 0, 0, 0, safeTz);
      break;
    }
    case 'all':
    default: {
      return {
        isValid: true,
        rangeKey: 'all',
        start: null,
        end: null,
        mongoFilter: null,
        timezone: safeTz,
      };
    }
  }

  return {
    isValid: true,
    rangeKey,
    start,
    end,
    mongoFilter: { $gte: start, $lt: end },
    timezone: safeTz,
  };
}

/**
 * Determine MongoDB dateToString format and label based on date range duration or explicit grouping.
 */
export function resolveGrouping({ rangeKey, start, end, group_by } = {}) {
  const explicitGroup = group_by ? String(group_by).trim().toLowerCase() : null;

  if (explicitGroup === 'hourly') {
    return { format: '%Y-%m-%d %H:00', grouping: 'hourly', limit: 48 };
  }
  if (explicitGroup === 'daily') {
    return { format: '%Y-%m-%d', grouping: 'daily', limit: 90 };
  }
  if (explicitGroup === 'monthly') {
    return { format: '%Y-%m', grouping: 'monthly', limit: 36 };
  }
  if (explicitGroup === 'yearly') {
    return { format: '%Y', grouping: 'yearly', limit: 10 };
  }

  // Automatic grouping based on range duration
  if (rangeKey === 'today' || rangeKey === 'yesterday' || rangeKey === '24h') {
    return { format: '%Y-%m-%d %H:00', grouping: 'hourly', limit: 24 };
  }

  if (start && end) {
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays <= 2.1) {
      return { format: '%Y-%m-%d %H:00', grouping: 'hourly', limit: 48 };
    }
    if (durationDays <= 92) {
      return { format: '%Y-%m-%d', grouping: 'daily', limit: 92 };
    }
    if (durationDays <= 735) {
      return { format: '%Y-%m', grouping: 'monthly', limit: 25 };
    }
    return { format: '%Y', grouping: 'yearly', limit: 10 };
  }

  if (rangeKey === '7d' || rangeKey === 'last_7_days' || rangeKey === '30d' || rangeKey === 'last_30_days' || rangeKey === 'this_month' || rangeKey === 'last_month') {
    return { format: '%Y-%m-%d', grouping: 'daily', limit: 31 };
  }

  if (rangeKey === 'this_year' || rangeKey === 'last_year') {
    return { format: '%Y-%m', grouping: 'monthly', limit: 12 };
  }

  // Fallback for 'all': daily
  return { format: '%Y-%m-%d', grouping: 'daily', limit: 120 };
}

/**
 * Format a Date object into a bucket string in the given timezone.
 */
function formatBucketString(date, grouping, timezone = DEFAULT_TIMEZONE) {
  const p = getZonedParts(date, timezone);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  const hh = String(p.hour).padStart(2, '0');

  if (grouping === 'hourly') {
    return `${p.year}-${mm}-${dd} ${hh}:00`;
  }
  if (grouping === 'daily') {
    return `${p.year}-${mm}-${dd}`;
  }
  if (grouping === 'monthly') {
    return `${p.year}-${mm}`;
  }
  return String(p.year);
}

/**
 * Zero-fill missing intervals within the selected time range.
 * Fills zero buckets strictly between start and end in chronological order.
 * If range is 'all' or unbounded, preserves real DB buckets sorted chronologically.
 */
export function fillMissingBuckets({ start, end, grouping, timezone = DEFAULT_TIMEZONE, dbTrend = [] } = {}) {
  const safeTz = sanitizeTimezone(timezone);

  // If no bound is defined (e.g. 'all' with no start/end)
  if (!start || !end) {
    return [...dbTrend].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }

  const bucketsMap = new Map();

  if (grouping === 'hourly') {
    // Step hour by hour
    let cur = new Date(start.getTime());
    while (cur.getTime() < end.getTime()) {
      const key = formatBucketString(cur, 'hourly', safeTz);
      bucketsMap.set(key, { time: key, page_views: 0, clicks: 0, events: 0 });
      // Next hour in safeTz
      const p = getZonedParts(cur, safeTz);
      cur = zonedToUtc(p.year, p.month, p.day, p.hour + 1, 0, 0, 0, safeTz);
    }
  } else if (grouping === 'daily') {
    // Step day by day
    let cur = new Date(start.getTime());
    while (cur.getTime() < end.getTime()) {
      const key = formatBucketString(cur, 'daily', safeTz);
      bucketsMap.set(key, { time: key, page_views: 0, clicks: 0, events: 0 });
      // Next day in safeTz
      const p = getZonedParts(cur, safeTz);
      cur = zonedToUtc(p.year, p.month, p.day + 1, 0, 0, 0, 0, safeTz);
    }
  } else if (grouping === 'monthly') {
    // Step month by month
    let cur = new Date(start.getTime());
    while (cur.getTime() < end.getTime()) {
      const key = formatBucketString(cur, 'monthly', safeTz);
      bucketsMap.set(key, { time: key, page_views: 0, clicks: 0, events: 0 });
      // Next month in safeTz
      const p = getZonedParts(cur, safeTz);
      cur = zonedToUtc(p.year, p.month + 1, 1, 0, 0, 0, 0, safeTz);
    }
  } else if (grouping === 'yearly') {
    // Step year by year
    let cur = new Date(start.getTime());
    while (cur.getTime() < end.getTime()) {
      const key = formatBucketString(cur, 'yearly', safeTz);
      bucketsMap.set(key, { time: key, page_views: 0, clicks: 0, events: 0 });
      // Next year in safeTz
      const p = getZonedParts(cur, safeTz);
      cur = zonedToUtc(p.year + 1, 1, 1, 0, 0, 0, 0, safeTz);
    }
  }

  // Merge in actual DB aggregation values
  for (const item of dbTrend) {
    if (item && item.time) {
      bucketsMap.set(item.time, {
        time: item.time,
        page_views: Number(item.page_views) || 0,
        clicks: Number(item.clicks) || 0,
        events: Number(item.events) || 0,
      });
    }
  }

  // Return strictly sorted array
  return Array.from(bucketsMap.values()).sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

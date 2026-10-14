import Event from '../models/Event.js';
import broadcaster from '../utils/broadcaster.js';
import {
  resolveDateRange,
  resolveGrouping,
  fillMissingBuckets,
  parseTimestamp,
  normalizeUrl,
  sanitizeTimezone,
} from '../utils/dateFilter.js';

/**
 * Ingest and persist a validated tracking event.
 * Broadcasts the event to all active real-time dashboard subscribers.
 * POST /api/events
 */
export async function createEvent(req, res, next) {
  try {
    const { site_id, session_id, event_type, page_url, timestamp, coordinates, viewport, doc_width, doc_height, scroll_x, scroll_y, element, is_fixed } = req.body;

    const eventData = {
      site_id: site_id ? String(site_id).trim().toLowerCase() : 'cf_demo_site',
      session_id: session_id.trim(),
      event_type,
      page_url: normalizeUrl(page_url),
      timestamp: parseTimestamp(timestamp),
      coordinates: event_type === 'click' && coordinates ? {
        x: Number(coordinates.x),
        y: Number(coordinates.y),
        ...(coordinates.client_x != null ? { client_x: Number(coordinates.client_x) } : {}),
        ...(coordinates.client_y != null ? { client_y: Number(coordinates.client_y) } : {}),
      } : null,
      viewport: viewport ? { width: Math.round(Number(viewport.width)), height: Math.round(Number(viewport.height)) } : null,
      scroll_x: event_type === 'click' && scroll_x != null ? Number(scroll_x) : 0,
      scroll_y: event_type === 'click' && scroll_y != null ? Number(scroll_y) : 0,
      // Document scroll dimensions - store for overlay heatmap scaling
      doc_width: event_type === 'click' && doc_width != null ? Math.round(Number(doc_width)) : null,
      doc_height: event_type === 'click' && doc_height != null ? Math.round(Number(doc_height)) : null,
      is_fixed: event_type === 'click' ? Boolean(is_fixed) : false,
      // Clicked DOM element metadata for inspection
      element: event_type === 'click' && element ? {
        tag: String(element.tag || '').slice(0, 50),
        id: String(element.id || '').slice(0, 100),
        classes: String(element.classes || '').slice(0, 200),
        text: String(element.text || '').slice(0, 100),
        role: String(element.role || '').slice(0, 50),
        href: String(element.href || '').slice(0, 250),
        rect: element.rect ? {
          top: Number(element.rect.top) || 0,
          left: Number(element.rect.left) || 0,
          width: Number(element.rect.width) || 0,
          height: Number(element.rect.height) || 0,
        } : null,
      } : null,
    };

    const newEvent = await Event.create(eventData);

    // Broadcast in real-time to all connected SSE clients
    broadcaster.broadcastEvent(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      data: newEvent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Real-time SSE streaming endpoint.
 * GET /api/events/live?site_id=...
 */
export function streamEvents(req, res) {
  const siteId = req.query.site_id ? String(req.query.site_id).trim().toLowerCase() : 'cf_demo_site';
  broadcaster.register(req, res, siteId);
}

/**
 * Retrieve the latest 20 real events for the Live Events Feed.
 * GET /api/events/recent?site_id=...
 */
export async function getRecentEvents(req, res, next) {
  try {
    const siteId = req.query.site_id ? String(req.query.site_id).trim().toLowerCase() : 'cf_demo_site';
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));

    const filter = {};
    if (siteId && siteId !== 'all') {
      filter.site_id = siteId;
    }

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('site_id session_id event_type page_url timestamp coordinates viewport');

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve high-level analytics summary for dashboard overview.
 * Supports presets (today, yesterday, 7d, 30d, monthly, yearly, all) and custom ISO ranges,
 * with separated chart time grouping (hourly, daily, monthly, yearly, auto).
 * GET /api/events/stats?site_id=...&time_range=...&startDate=...&endDate=...&group_by=...
 */
export async function getStatsSummary(req, res, next) {
  try {
    const siteId = req.query.site_id ? String(req.query.site_id).trim().toLowerCase() : null;
    const timeRange = req.query.time_range ? String(req.query.time_range).trim().toLowerCase() : 'all';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const groupBy = req.query.group_by;

    // Validate and sanitize timezone (defaults to Asia/Kolkata)
    const timezone = sanitizeTimezone(req.query.timezone || 'Asia/Kolkata');

    // Resolve date bounds
    const dateResolution = resolveDateRange({ time_range: timeRange, startDate, endDate, timezone });
    if (!dateResolution.isValid) {
      return res.status(400).json({
        success: false,
        message: dateResolution.error,
      });
    }

    const filter = {};
    if (siteId && siteId !== 'all') {
      filter.site_id = siteId;
    }

    if (dateResolution.mongoFilter) {
      filter.timestamp = dateResolution.mongoFilter;
    }

    // 1. Overall counts - execute in a single high-performance aggregation pass
    const countsAggregation = await Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalPageViews: {
            $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] },
          },
          totalClicks: {
            $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] },
          },
          sessions: { $addToSet: '$session_id' },
        },
      },
      {
        $project: {
          _id: 0,
          totalEvents: 1,
          totalPageViews: 1,
          totalClicks: 1,
          totalSessions: { $size: '$sessions' },
        },
      },
    ]);

    const countData = countsAggregation[0] || {
      totalEvents: 0,
      totalPageViews: 0,
      totalClicks: 0,
      totalSessions: 0,
    };
    const { totalEvents, totalPageViews, totalClicks, totalSessions } = countData;

    const groupInfo = resolveGrouping({
      rangeKey: dateResolution.rangeKey,
      start: dateResolution.start,
      end: dateResolution.end,
      group_by: groupBy,
    });

    // If no events match, return zero-filled response immediately without running sub-aggregations
    if (totalEvents === 0) {
      const emptyTrend = fillMissingBuckets({
        start: dateResolution.start,
        end: dateResolution.end,
        grouping: groupInfo.grouping,
        timezone,
        dbTrend: [],
      });

      return res.status(200).json({
        success: true,
        data: {
          site_id: siteId || 'all',
          time_range: dateResolution.rangeKey,
          startDate: dateResolution.start,
          endDate: dateResolution.end,
          grouping: groupInfo.grouping,
          totalSessions: 0,
          totalEvents: 0,
          totalPageViews: 0,
          totalClicks: 0,
          activityTrend: emptyTrend,
          topPages: [],
          recentSessions: [],
        },
      });
    }

    // 2. Activity breakdown by determined grouping in user's timezone
    const dbActivityTrendPromise = Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupInfo.format,
              date: '$timestamp',
              timezone,
            },
          },
          events: { $sum: 1 },
          page_views: {
            $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] },
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: groupInfo.limit },
      {
        $project: {
          _id: 0,
          time: '$_id',
          events: 1,
          page_views: 1,
          clicks: 1,
        },
      },
    ]);

    // 3. Top pages visited
    const topPagesPromise = Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$page_url',
          total_events: { $sum: 1 },
          page_views: {
            $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] },
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] },
          },
        },
      },
      { $sort: { total_events: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          url: '$_id',
          total_events: 1,
          page_views: 1,
          clicks: 1,
        },
      },
    ]);

    // 4. Five most recent sessions - find latest session IDs via index first, then aggregate only those 5
    const recentSessionsPromise = (async () => {
      const recentDocs = await Event.find(filter)
        .sort({ timestamp: -1 })
        .select('session_id')
        .limit(100);

      const candidateSessionIds = [];
      for (const doc of recentDocs) {
        if (doc.session_id && !candidateSessionIds.includes(doc.session_id)) {
          candidateSessionIds.push(doc.session_id);
          if (candidateSessionIds.length >= 5) break;
        }
      }

      if (candidateSessionIds.length === 0) return [];

      return Event.aggregate([
        { $match: { ...filter, session_id: { $in: candidateSessionIds } } },
        {
          $group: {
            _id: '$session_id',
            total_events: { $sum: 1 },
            page_views: {
              $sum: { $cond: [{ $eq: ['$event_type', 'page_view'] }, 1, 0] },
            },
            clicks: {
              $sum: { $cond: [{ $eq: ['$event_type', 'click'] }, 1, 0] },
            },
            first_event: { $min: '$timestamp' },
            last_event: { $max: '$timestamp' },
          },
        },
        { $sort: { last_event: -1 } },
        {
          $project: {
            _id: 0,
            session_id: '$_id',
            total_events: 1,
            page_views: 1,
            clicks: 1,
            first_event: 1,
            last_event: 1,
          },
        },
      ]);
    })();

    const [dbActivityTrend, topPages, recentSessions] = await Promise.all([
      dbActivityTrendPromise,
      topPagesPromise,
      recentSessionsPromise,
    ]);

    // Zero-fill missing intervals within the selected time range
    const activityTrend = fillMissingBuckets({
      start: dateResolution.start,
      end: dateResolution.end,
      grouping: groupInfo.grouping,
      timezone,
      dbTrend: dbActivityTrend,
    });

    return res.status(200).json({
      success: true,
      data: {
        site_id: siteId || 'all',
        time_range: dateResolution.rangeKey,
        startDate: dateResolution.start,
        endDate: dateResolution.end,
        grouping: groupInfo.grouping,
        totalSessions,
        totalEvents,
        totalPageViews,
        totalClicks,
        activityTrend,
        topPages,
        recentSessions,
      },
    });
  } catch (error) {
    next(error);
  }
}

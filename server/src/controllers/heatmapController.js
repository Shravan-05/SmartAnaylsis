import Event from '../models/Event.js';
import { resolveDateRange, sanitizeTimezone, normalizeUrl } from '../utils/dateFilter.js';

/**
 * Return distinct page URLs that have recorded click events.
 * Supports date filtering and URL normalization.
 * GET /api/heatmap/pages?site_id=...&time_range=...&startDate=...&endDate=...&timezone=...
 */
export async function getHeatmapPages(req, res, next) {
  try {
    const siteId = typeof req.query.site_id === 'string' ? req.query.site_id.trim().toLowerCase() : null;
    const timeRange = req.query.time_range;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const timezone = sanitizeTimezone(req.query.timezone || 'Asia/Kolkata');

    const filter = {
      event_type: 'click',
      coordinates: { $ne: null },
    };

    if (siteId && siteId !== 'all') {
      filter.site_id = siteId;
    }

    if (timeRange || (startDate && endDate)) {
      const dateResolution = resolveDateRange({ time_range: timeRange, startDate, endDate, timezone });
      if (!dateResolution.isValid) {
        return res.status(400).json({
          success: false,
          message: dateResolution.error,
        });
      }
      if (dateResolution.mongoFilter) {
        filter.timestamp = dateResolution.mongoFilter;
      }
    }

    const rawPages = await Event.distinct('page_url', filter);

    // Normalize pages and deduplicate trailing slash variants
    const uniquePages = Array.from(new Set(rawPages.map(normalizeUrl).filter(Boolean)));

    return res.status(200).json({
      success: true,
      site_id: siteId || 'all',
      count: uniquePages.length,
      data: uniquePages,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Return click coordinates and total count for a specified page URL.
 * Supports date filtering and URL normalization.
 * GET /api/heatmap?url=PAGE_URL&site_id=...&time_range=...&startDate=...&endDate=...&timezone=...
 */
export async function getHeatmapData(req, res, next) {
  try {
    const rawUrl = req.query.url;
    const siteId = typeof req.query.site_id === 'string' ? req.query.site_id.trim().toLowerCase() : null;
    const timeRange = req.query.time_range;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : null;
    const timezone = sanitizeTimezone(req.query.timezone || 'Asia/Kolkata');

    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "url" is required and cannot be empty',
      });
    }

    const trimmedUrl = String(rawUrl).trim();
    const normalized = normalizeUrl(trimmedUrl);

    // Match exact URL, normalized URL, and trailing slash variant
    const urlVariants = Array.from(new Set([trimmedUrl, normalized, `${normalized}/`]));

    const filter = {
      page_url: { $in: urlVariants },
      event_type: 'click',
      'coordinates.x': { $exists: true },
      'coordinates.y': { $exists: true },
    };

    if (siteId && siteId !== 'all') {
      filter.site_id = siteId;
    }

    if (sessionId) {
      filter.session_id = sessionId;
    }

    if (timeRange || (startDate && endDate)) {
      const dateResolution = resolveDateRange({ time_range: timeRange, startDate, endDate, timezone });
      if (!dateResolution.isValid) {
        return res.status(400).json({
          success: false,
          message: dateResolution.error,
        });
      }
      if (dateResolution.mongoFilter) {
        filter.timestamp = dateResolution.mongoFilter;
      }
    }

    // Query click events matching URL with valid coordinates
    const clicks = await Event.find(filter)
      .select('coordinates viewport doc_width doc_height scroll_x scroll_y is_fixed element timestamp site_id session_id -_id')
      .sort({ timestamp: 1 });

    const coordinates = clicks.map((item) => ({
      x: item.coordinates.x,
      y: item.coordinates.y,
      ...(item.coordinates.client_x != null ? { client_x: item.coordinates.client_x } : {}),
      ...(item.coordinates.client_y != null ? { client_y: item.coordinates.client_y } : {}),
      timestamp: item.timestamp,
      viewport: item.viewport || null,
      // Document dimensions at click time — used for overlay scale computation
      doc_width: item.doc_width || null,
      doc_height: item.doc_height || null,
      scroll_x: item.scroll_x || 0,
      scroll_y: item.scroll_y || 0,
      is_fixed: Boolean(item.is_fixed),
      element: item.element || null,
      site_id: item.site_id,
      session_id: item.session_id,
    }));

    return res.status(200).json({
      success: true,
      page_url: normalized || trimmedUrl,
      site_id: siteId || 'all',
      total_clicks: coordinates.length,
      coordinates,
    });
  } catch (error) {
    next(error);
  }
}

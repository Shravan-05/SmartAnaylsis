import Event from '../models/Event.js';
import { resolveDateRange, sanitizeTimezone } from '../utils/dateFilter.js';

/**
 * Retrieve paginated session summaries with aggregated event counts and activity timestamps.
 * Supports date filtering across presets and custom ranges.
 * GET /api/sessions?page=1&limit=10&search=...&site_id=...&time_range=...&startDate=...&endDate=...&timezone=...
 */
export async function getSessions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const siteId = typeof req.query.site_id === 'string' ? req.query.site_id.trim().toLowerCase() : null;
    const timeRange = req.query.time_range;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const timezone = sanitizeTimezone(req.query.timezone || 'Asia/Kolkata');

    const matchStage = {};

    // Filter by site_id if provided
    if (siteId && siteId !== 'all') {
      matchStage.site_id = siteId;
      if (siteId === 'cf_demo_site') {
        matchStage.page_url = { $regex: '/demo' };
      }
    }

    // Apply date range filter
    if (timeRange || (startDate && endDate)) {
      const dateResolution = resolveDateRange({ time_range: timeRange, startDate, endDate, timezone });
      if (!dateResolution.isValid) {
        return res.status(400).json({
          success: false,
          message: dateResolution.error,
        });
      }
      if (dateResolution.mongoFilter) {
        matchStage.timestamp = dateResolution.mongoFilter;
      }
    }

    // Sanitize regex search to prevent ReDoS
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchStage.session_id = { $regex: safeSearch, $options: 'i' };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$session_id',
          site_id: { $first: '$site_id' },
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
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const [result] = await Event.aggregate(pipeline);

    const totalSessions = result?.metadata?.[0]?.total || 0;
    const totalPages = Math.ceil(totalSessions / limit) || 1;

    const sessions = (result?.data || []).map((session) => ({
      session_id: session._id,
      site_id: session.site_id,
      total_events: session.total_events,
      page_views: session.page_views,
      clicks: session.clicks,
      first_event: session.first_event,
      last_event: session.last_event,
    }));

    return res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        total: totalSessions,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve all events for a specific session sorted chronologically.
 * Supports date filtering.
 * GET /api/sessions/:sessionId/events?site_id=...&time_range=...&startDate=...&endDate=...
 */
export async function getSessionEvents(req, res, next) {
  try {
    const rawSessionId = req.params.sessionId;

    if (!rawSessionId || typeof rawSessionId !== 'string' || rawSessionId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID provided',
      });
    }

    const sessionId = String(rawSessionId).trim();
    const siteId = typeof req.query.site_id === 'string' ? req.query.site_id.trim().toLowerCase() : null;
    const timeRange = req.query.time_range;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const timezone = sanitizeTimezone(req.query.timezone || 'Asia/Kolkata');

    const filter = { session_id: sessionId };
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

    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .select('site_id event_type page_url timestamp coordinates viewport element -_id');

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No events found for session: "${sessionId}"`,
      });
    }

    return res.status(200).json({
      success: true,
      session_id: sessionId,
      total_events: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

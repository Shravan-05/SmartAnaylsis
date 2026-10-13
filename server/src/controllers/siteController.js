import Site from '../models/Site.js';
import Event from '../models/Event.js';

/**
 * List all registered websites.
 * GET /api/sites
 */
export async function getSites(req, res, next) {
  try {
    const sites = await Site.find().sort({ created_at: -1 });

    // Include quick event stats for each site
    const sitesWithStats = await Promise.all(
      sites.map(async (site) => {
        const [totalEvents, uniqueSessions] = await Promise.all([
          Event.countDocuments({ site_id: site.site_id }),
          Event.distinct('session_id', { site_id: site.site_id }),
        ]);

        return {
          id: site._id,
          site_id: site.site_id,
          name: site.name,
          domain: site.domain,
          created_at: site.created_at,
          total_events: totalEvents,
          total_sessions: uniqueSessions.length,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: sitesWithStats.length,
      data: sitesWithStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new website for tracking.
 * POST /api/sites
 */
export async function createSite(req, res, next) {
  try {
    const { site_id, name, domain } = req.body || {};
    const errors = [];

    if (!site_id || typeof site_id !== 'string' || site_id.trim().length === 0) {
      errors.push('site_id is required');
    } else if (!/^[a-z0-9_-]{3,50}$/i.test(site_id.trim())) {
      errors.push('site_id must be between 3 and 50 alphanumeric characters, hyphens, or underscores');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('name is required and must be a valid string');
    }

    if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
      errors.push('domain is required and must be a valid string or URL');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Website validation failed',
        errors,
      });
    }

    const cleanSiteId = site_id.trim().toLowerCase();

    // Check duplicate
    const existing = await Site.findOne({ site_id: cleanSiteId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Website with site_id "${cleanSiteId}" already exists`,
      });
    }

    const newSite = await Site.create({
      site_id: cleanSiteId,
      name: name.trim(),
      domain: domain.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Website registered successfully',
      data: newSite,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get details for a specific website.
 * GET /api/sites/:siteId
 */
export async function getSiteById(req, res, next) {
  try {
    const siteId = String(req.params.siteId).trim().toLowerCase();
    const site = await Site.findOne({ site_id: siteId });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: `Website "${siteId}" not found`,
      });
    }

    const [totalEvents, totalClicks, totalPageViews, uniqueSessions] = await Promise.all([
      Event.countDocuments({ site_id: siteId }),
      Event.countDocuments({ site_id: siteId, event_type: 'click' }),
      Event.countDocuments({ site_id: siteId, event_type: 'page_view' }),
      Event.distinct('session_id', { site_id: siteId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...site.toJSON(),
        stats: {
          total_events: totalEvents,
          total_clicks: totalClicks,
          total_page_views: totalPageViews,
          total_sessions: uniqueSessions.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

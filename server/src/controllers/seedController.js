import Event from '../models/Event.js';
import Site, { ensureDefaultSite } from '../models/Site.js';
import broadcaster from '../utils/broadcaster.js';

/**
 * Generate realistic simulated user browsing sessions with page views and clicks.
 * POST /api/seed
 */
export async function seedDemoData(req, res, next) {
  try {
    // Security check: protect seed operations in production
    if (process.env.NODE_ENV === 'production') {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({
          success: false,
          message: 'Seeding analytics data in production requires valid x-admin-key header authentication',
        });
      }
    }

    const { sessionCount = 6, site_id = 'cf_demo_site' } = req.body || {};
    const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

    // Ensure site exists
    await ensureDefaultSite();

    const targetSiteId = String(site_id).trim().toLowerCase();
    const existingSite = await Site.findOne({ site_id: targetSiteId });
    if (!existingSite && targetSiteId !== 'cf_demo_site') {
      await Site.create({
        site_id: targetSiteId,
        name: `${targetSiteId.toUpperCase()} Site`,
        domain: clientOrigin,
      });
    }

    const demoPages = [
      `${clientOrigin}/demo`,
      `${clientOrigin}/demo?tab=telemetry`,
      `${clientOrigin}/demo?tier=pro`,
    ];

    const sampleElements = [
      {
        tag: 'button',
        id: 'btn-signin',
        text: 'Sign In',
        x: 1140,
        y: 32,
        client_x: 1140,
        client_y: 32,
        scroll_y: 0,
        is_fixed: true,
      },
      {
        tag: 'button',
        id: 'btn-cart-instances',
        text: 'Clusters (0)',
        x: 1040,
        y: 32,
        client_x: 1040,
        client_y: 32,
        scroll_y: 0,
        is_fixed: true,
      },
      {
        tag: 'button',
        id: 'btn-hero-trial',
        text: 'Start 14-Day Free Trial',
        x: 620,
        y: 280,
        client_x: 620,
        client_y: 280,
        scroll_y: 0,
        is_fixed: false,
      },
      {
        tag: 'button',
        id: 'btn-hero-demo',
        text: 'Book Technical Demo',
        x: 810,
        y: 280,
        client_x: 810,
        client_y: 280,
        scroll_y: 0,
        is_fixed: false,
      },
      {
        tag: 'button',
        id: 'btn-tab-telemetry',
        text: 'Telemetry',
        x: 880,
        y: 530,
        client_x: 880,
        client_y: 530,
        scroll_y: 0,
        is_fixed: false,
      },
      {
        tag: 'button',
        id: 'btn-plan-pro',
        text: 'Start 14-Day Free Trial',
        x: 720,
        y: 2600,
        client_x: 720,
        client_y: 500,
        scroll_y: 2100,
        is_fixed: false,
      },
      {
        tag: 'button',
        id: 'btn-plan-starter',
        text: 'Select Starter',
        x: 380,
        y: 2600,
        client_x: 380,
        client_y: 500,
        scroll_y: 2100,
        is_fixed: false,
      },
      {
        tag: 'button',
        id: 'btn-faq-scale',
        text: 'How does ApexCloud scale serverless functions globally?',
        x: 600,
        y: 3400,
        client_x: 600,
        client_y: 400,
        scroll_y: 3000,
        is_fixed: false,
      },
    ];

    const createdEvents = [];
    const now = Date.now();

    for (let s = 1; s <= sessionCount; s++) {
      const sessionId = `session_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      let currentTime = now - (sessionCount - s) * 3600000 - Math.floor(Math.random() * 1800000);

      // 1. Initial Page View
      const primaryUrl = demoPages[0];
      createdEvents.push({
        site_id: targetSiteId,
        session_id: sessionId,
        event_type: 'page_view',
        page_url: primaryUrl,
        timestamp: new Date(currentTime),
        coordinates: null,
        viewport: { width: 1440, height: 900 },
        doc_width: 1440,
        doc_height: 3800,
      });

      // 2. Generate 3 to 6 user clicks on this page with realistic coordinates
      const clickCount = Math.floor(Math.random() * 4) + 3;
      for (let c = 0; c < clickCount; c++) {
        currentTime += Math.floor(Math.random() * 25000) + 2000;
        const target = sampleElements[Math.floor(Math.random() * sampleElements.length)];
        const x = Math.max(10, target.x + Math.floor((Math.random() - 0.5) * 16));
        const y = Math.max(10, target.y + Math.floor((Math.random() - 0.5) * 16));

        createdEvents.push({
          site_id: targetSiteId,
          session_id: sessionId,
          event_type: 'click',
          page_url: primaryUrl,
          timestamp: new Date(currentTime),
          coordinates: {
            x,
            y,
            client_x: target.is_fixed ? x : target.client_x,
            client_y: target.is_fixed ? y : target.client_y,
          },
          scroll_x: 0,
          scroll_y: target.scroll_y,
          viewport: { width: 1440, height: 900 },
          doc_width: 1440,
          doc_height: 3800,
          is_fixed: target.is_fixed,
          element: {
            tag: target.tag,
            id: target.id,
            text: target.text,
            classes: '',
            role: 'button',
          },
        });
      }

      // 3. 40% chance user navigates to legitimate SPA sub-route
      if (Math.random() > 0.6) {
        currentTime += 15000;
        const subPage = demoPages[1];
        createdEvents.push({
          site_id: targetSiteId,
          session_id: sessionId,
          event_type: 'page_view',
          page_url: subPage,
          timestamp: new Date(currentTime),
          coordinates: null,
          viewport: { width: 1440, height: 900 },
          doc_width: 1440,
          doc_height: 3800,
        });

        // Click on the sub-route
        currentTime += 8000;
        const subTarget = sampleElements[4]; // telemetry tab click
        createdEvents.push({
          site_id: targetSiteId,
          session_id: sessionId,
          event_type: 'click',
          page_url: subPage,
          timestamp: new Date(currentTime),
          coordinates: {
            x: subTarget.x,
            y: subTarget.y,
            client_x: subTarget.client_x,
            client_y: subTarget.client_y,
          },
          scroll_x: 0,
          scroll_y: 0,
          viewport: { width: 1440, height: 900 },
          doc_width: 1440,
          doc_height: 3800,
          is_fixed: false,
          element: {
            tag: subTarget.tag,
            id: subTarget.id,
            text: subTarget.text,
            classes: '',
            role: 'button',
          },
        });
      }
    }

    const inserted = await Event.insertMany(createdEvents);

    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${inserted.length} analytics events across ${sessionCount} sessions for site "${targetSiteId}"!`,
      site_id: targetSiteId,
      sessionsCreated: sessionCount,
      eventsInserted: inserted.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset and clear event data.
 * Strictly scoped to target site_id (defaults to cf_demo_site).
 * Protected in production environments.
 * DELETE /api/seed
 */
export async function clearDemoData(req, res, next) {
  try {
    // Security check: protect data in production
    if (process.env.NODE_ENV === 'production') {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({
          success: false,
          message: 'Resetting analytics data in production requires valid x-admin-key header authentication',
        });
      }
    }

    // Always scope to target site_id to prevent deleting unrelated data or website registrations
    const rawSiteId = req.query.site_id || req.body?.site_id;
    const siteId = rawSiteId && rawSiteId !== 'all'
      ? String(rawSiteId).trim().toLowerCase()
      : 'cf_demo_site';

    const filter = { site_id: siteId };

    const result = await Event.deleteMany(filter);

    // Broadcast reset event to all connected dashboard clients
    broadcaster.broadcastReset(siteId);

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} analytics events from database for site "${siteId}". Configurations and registered websites preserved.`,
      deletedCount: result.deletedCount,
      site_id: siteId,
    });
  } catch (error) {
    next(error);
  }
}

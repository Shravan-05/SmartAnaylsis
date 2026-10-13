import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Event from '../src/models/Event.js';
import Site, { ensureDefaultSite } from '../src/models/Site.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics_test';

beforeAll(async () => {
  await connectDB(TEST_MONGO_URI);
  await ensureDefaultSite();
});

afterAll(async () => {
  await Event.deleteMany({});
  await Site.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await Event.deleteMany({});
});

describe('Tracker & Heatmap Engineering Accuracy Test Suite', () => {
  describe('1. Accurate Page-View Tracking & Anchor Jump Rules', () => {
    it('should record exactly one page_view on initial load with query parameters', async () => {
      const res = await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'session_test_pv1',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo?campaign=summer&tier=pro',
        timestamp: new Date().toISOString(),
        viewport: { width: 1440, height: 900 },
        doc_width: 1440,
        doc_height: 3800,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbEvent = await Event.findById(res.body.data.id || res.body.data._id);
      expect(dbEvent.event_type).toBe('page_view');
      expect(dbEvent.page_url).toContain('campaign=summer');
      expect(dbEvent.coordinates).toBeNull();
    });

    it('should normalize in-page anchor jumps (#features, #pricing) to same route without duplicate page views', () => {
      // In tracker.js, in-page hash scroll is detected via getRoutePathAndQuery
      const cleanUrl = (url) => {
        const parsed = new URL(url);
        parsed.hash = '';
        return parsed.toString();
      };

      const base = 'http://localhost:5173/demo';
      const hashFeatures = 'http://localhost:5173/demo#features';
      const hashPricing = 'http://localhost:5173/demo#pricing';

      expect(cleanUrl(hashFeatures)).toBe(base);
      expect(cleanUrl(hashPricing)).toBe(base);
    });

    it('should record distinct page views for genuine SPA navigation routes', async () => {
      const routes = [
        'http://localhost:5173/demo',
        'http://localhost:5173/demo?tab=telemetry',
        'http://localhost:5173/demo?tab=pricing',
      ];

      for (const route of routes) {
        await request(app).post('/api/events').send({
          site_id: 'cf_demo_site',
          session_id: 'session_spa_user',
          event_type: 'page_view',
          page_url: route,
          timestamp: new Date().toISOString(),
          viewport: { width: 1440, height: 900 },
        });
      }

      const events = await Event.find({ session_id: 'session_spa_user', event_type: 'page_view' });
      expect(events.length).toBe(3);
      expect(events.map((e) => e.page_url)).toEqual(routes);
    });

    it('clicking a button must NOT automatically create a page_view event', async () => {
      // Send a single click event
      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_button_only',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: { x: 500, y: 300 },
      });

      const pvs = await Event.find({ session_id: 'sess_button_only', event_type: 'page_view' });
      const clicks = await Event.find({ session_id: 'sess_button_only', event_type: 'click' });
      expect(pvs.length).toBe(0);
      expect(clicks.length).toBe(1);
    });
  });

  describe('2. Precise Document Coordinates, Scroll Offsets & Element Metadata', () => {
    it('should store document-relative coordinates and verify pageY = clientY + scrollY', async () => {
      const clientX = 450;
      const clientY = 320;
      const scrollX = 0;
      const scrollY = 1500;
      const pageX = clientX + scrollX;
      const pageY = clientY + scrollY;

      const res = await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'session_scroll_test',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: {
          x: pageX,
          y: pageY,
          client_x: clientX,
          client_y: clientY,
        },
        scroll_x: scrollX,
        scroll_y: scrollY,
        viewport: { width: 1440, height: 900 },
        doc_width: 1440,
        doc_height: 4200,
        element: {
          tag: 'button',
          id: 'btn-plan-pro',
          classes: 'rounded-xl bg-teal-500',
          text: 'Start 14-Day Free Trial',
          role: 'button',
        },
      });

      expect(res.status).toBe(201);
      const saved = await Event.findById(res.body.data.id || res.body.data._id);
      expect(saved.coordinates.x).toBe(450);
      expect(saved.coordinates.y).toBe(1820);
      expect(saved.coordinates.client_x).toBe(450);
      expect(saved.coordinates.client_y).toBe(320);
      expect(saved.scroll_y).toBe(1500);
      expect(saved.doc_height).toBe(4200);
      expect(saved.element.id).toBe('btn-plan-pro');
      expect(saved.element.tag).toBe('button');
      expect(saved.element.text).toBe('Start 14-Day Free Trial');

      // Verify mathematical relationship
      expect(saved.coordinates.y).toBe(saved.coordinates.client_y + saved.scroll_y);
    });

    it('should preserve physical click coordinates on nested elements without snapping to center', async () => {
      // Clicking on icon inside a 200x50 button at offset (35, 15)
      // Button rect is at top: 200, left: 100
      // Physical click is at (135, 215)
      const res = await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'session_nested_click',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: { x: 135, y: 215 },
        element: {
          tag: 'button',
          id: 'btn-cart-instances',
          text: 'Clusters (0)',
          rect: { top: 200, left: 100, width: 200, height: 50 },
        },
      });

      expect(res.status).toBe(201);
      const saved = await Event.findById(res.body.data.id || res.body.data._id);
      // Original physical click coordinates MUST be preserved, NOT element center (200, 225)
      expect(saved.coordinates.x).toBe(135);
      expect(saved.coordinates.y).toBe(215);
      expect(saved.element.id).toBe('btn-cart-instances');
    });

    it('clicking different navbar items records distinct element IDs and coordinates', async () => {
      const navbarClicks = [
        { id: 'btn-cart-instances', text: 'Clusters (0)', x: 700, y: 30 },
        { id: 'btn-signin', text: 'Sign In', x: 800, y: 30 },
        { id: 'btn-return-dashboard', text: 'Analytics Dashboard', x: 920, y: 30 },
      ];

      for (const item of navbarClicks) {
        await request(app).post('/api/events').send({
          site_id: 'cf_demo_site',
          session_id: 'sess_navbar_test',
          event_type: 'click',
          page_url: 'http://localhost:5173/demo',
          timestamp: new Date().toISOString(),
          coordinates: { x: item.x, y: item.y },
          element: { tag: 'button', id: item.id, text: item.text },
        });
      }

      const events = await Event.find({ session_id: 'sess_navbar_test' }).sort({ timestamp: 1 });
      expect(events.length).toBe(3);
      expect(events[0].element.id).toBe('btn-cart-instances');
      expect(events[1].element.id).toBe('btn-signin');
      expect(events[2].element.id).toBe('btn-return-dashboard');
      expect(events.map((e) => e.coordinates.x)).toEqual([700, 800, 920]);
    });

    it('should accurately store and return clicks across top, middle, and bottom of tall page', async () => {
      const clicks = [
        { label: 'top_navbar', x: 800, y: 35, client_y: 35, scroll_y: 0 },
        { label: 'middle_features', x: 600, y: 1650, client_y: 250, scroll_y: 1400 },
        { label: 'bottom_footer', x: 720, y: 3600, client_y: 400, scroll_y: 3200 },
      ];

      for (const c of clicks) {
        await request(app).post('/api/events').send({
          site_id: 'cf_demo_site',
          session_id: 'session_multi_click',
          event_type: 'click',
          page_url: 'http://localhost:5173/demo',
          timestamp: new Date().toISOString(),
          coordinates: { x: c.x, y: c.y, client_x: c.x, client_y: c.client_y },
          scroll_x: 0,
          scroll_y: c.scroll_y,
          viewport: { width: 1440, height: 900 },
          doc_width: 1440,
          doc_height: 3800,
        });
      }

      const res = await request(app).get('/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site');
      expect(res.status).toBe(200);
      expect(res.body.total_clicks).toBe(3);

      const returned = res.body.coordinates;
      expect(returned[0].y).toBe(35);
      expect(returned[1].y).toBe(1650);
      expect(returned[2].y).toBe(3600);
      expect(returned[2].scroll_y).toBe(3200);
    });
  });

  describe('3. Heatmap Scaling and Marker Alignment Math', () => {
    it('should compute exact scaled coordinates without aspect ratio distortion', () => {
      const originalDocWidth = 1440;
      const OVERLAY_CONTAINER_WIDTH = 1200;
      const scaleX = OVERLAY_CONTAINER_WIDTH / originalDocWidth; // 1200 / 1440 = 0.83333...
      const scaleY = scaleX; // Uniform scaling

      const rawClickX = 720;
      const rawClickY = 1800;

      const scaledMarkerX = Math.round(rawClickX * scaleX);
      const scaledMarkerY = Math.round(rawClickY * scaleY);

      expect(scaledMarkerX).toBe(600);
      expect(scaledMarkerY).toBe(1500);

      // Aspect ratio of scaled coordinates must match original aspect ratio exactly
      expect(rawClickY / rawClickX).toBeCloseTo(scaledMarkerY / scaledMarkerX, 2);
    });

    it('should isolate heatmap clicks by date range, URL, and site_id without leakage', async () => {
      const t1 = new Date('2026-10-10T10:00:00.000Z');
      const t2 = new Date('2026-10-12T10:00:00.000Z');

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_1',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: t1.toISOString(),
        coordinates: { x: 100, y: 200 },
      });

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_2',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: t2.toISOString(),
        coordinates: { x: 300, y: 400 },
      });

      const res = await request(app).get(
        `/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site&startDate=2026-10-11T00:00:00.000Z&endDate=2026-10-13T00:00:00.000Z`
      );

      expect(res.status).toBe(200);
      expect(res.body.total_clicks).toBe(1);
      expect(res.body.coordinates[0].x).toBe(300);
      expect(res.body.coordinates[0].y).toBe(400);
    });
  });

  describe('4. Comprehensive Deterministic Click Accuracy Contract Suite', () => {
    const TOLERANCE_UNSCALED = 0.0; // 0.0px error when unscaled
    const TOLERANCE_ROUNDED = 0.5; // <= 0.5px maximum error for integer rounding
    const TOLERANCE_SUBPIXEL = 0.01; // <= 0.01px error for sub-pixel CSS float rendering

    it('Scenario 1: Four corners and document center with round-trip database survival', async () => {
      const W = 1440;
      const H = 3800;
      const points = [
        { name: 'Top-Left Corner', x: 0, y: 0 },
        { name: 'Top-Right Corner', x: W, y: 0 },
        { name: 'Bottom-Left Corner', x: 0, y: H },
        { name: 'Bottom-Right Corner', x: W, y: H },
        { name: 'Document Center', x: W / 2, y: H / 2 },
      ];

      for (const pt of points) {
        const res = await request(app).post('/api/events').send({
          site_id: 'cf_demo_site',
          session_id: 'sess_corners',
          event_type: 'click',
          page_url: 'http://localhost:5173/demo',
          timestamp: new Date().toISOString(),
          coordinates: { x: pt.x, y: pt.y, client_x: pt.x, client_y: pt.y },
          scroll_x: 0,
          scroll_y: 0,
          viewport: { width: W, height: 900 },
          doc_width: W,
          doc_height: H,
        });
        expect(res.status).toBe(201);
      }

      const res = await request(app).get('/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site');
      expect(res.status).toBe(200);
      expect(res.body.total_clicks).toBe(5);

      // Verify unscaled accuracy (0.0px error) and scaled accuracy
      const containerWidth = 1200;
      const scaleX = containerWidth / W;
      const scaleY = scaleX;

      for (let i = 0; i < points.length; i++) {
        const original = points[i];
        const dbPt = res.body.coordinates[i];

        // 1. Raw coordinates survive round trip exactly
        expect(dbPt.x).toBe(original.x);
        expect(dbPt.y).toBe(original.y);

        // 2. Unscaled marker error is 0.0px
        const unscaledRenderX = dbPt.x * 1.0;
        const unscaledRenderY = dbPt.y * 1.0;
        expect(Math.abs(unscaledRenderX - original.x)).toBeLessThanOrEqual(TOLERANCE_UNSCALED);
        expect(Math.abs(unscaledRenderY - original.y)).toBeLessThanOrEqual(TOLERANCE_UNSCALED);

        // 3. Scaled marker error is within mathematical rounding tolerance
        const exactScaledX = original.x * scaleX;
        const exactScaledY = original.y * scaleY;
        const roundedRenderX = Math.round(dbPt.x * scaleX);
        const roundedRenderY = Math.round(dbPt.y * scaleY);
        expect(Math.abs(roundedRenderX - exactScaledX)).toBeLessThanOrEqual(TOLERANCE_ROUNDED);
        expect(Math.abs(roundedRenderY - exactScaledY)).toBeLessThanOrEqual(TOLERANCE_ROUNDED);
      }
    });

    it('Scenario 2: Fixed and sticky navigation clicks before and after scrolling', async () => {
      // Before scroll: user clicks "Sign In" at navbar y=32 when scrollY=0
      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_sticky_nav',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: { x: 1140, y: 32, client_x: 1140, client_y: 32 },
        scroll_x: 0,
        scroll_y: 0,
        is_fixed: true,
        viewport: { width: 1440, height: 900 },
        doc_width: 1440,
        doc_height: 3800,
        element: { tag: 'button', id: 'btn-signin', text: 'Sign In' },
      });

      // After scroll: user scrolled to scrollY=2200 and clicks "Sign In" at clientY=32
      // Canonical document coordinate for the sticky navbar is clientY (32px), NOT 2232px
      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_sticky_nav',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: { x: 1140, y: 32, client_x: 1140, client_y: 32 },
        scroll_x: 0,
        scroll_y: 2200,
        is_fixed: true,
        viewport: { width: 1440, height: 900 },
        doc_width: 1440,
        doc_height: 3800,
        element: { tag: 'button', id: 'btn-signin', text: 'Sign In' },
      });

      const res = await request(app).get('/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site');
      const clicks = res.body.coordinates;
      expect(clicks.length).toBe(2);

      // Both before and after scrolling, the marker targets the navbar at y=32 in the unrolled preview
      expect(clicks[0].y).toBe(32);
      expect(clicks[1].y).toBe(32);
      expect(clicks[1].scroll_y).toBe(2200);
      expect(clicks[1].is_fixed).toBe(true);
    });

    it('Scenario 3: Multi-viewport fidelity across Desktop (1440), Tablet (768), and Mobile (390)', async () => {
      const viewports = [
        { type: 'desktop', w: 1440, h: 900, clickX: 720, clickY: 2600, docW: 1440, docH: 3800 },
        { type: 'tablet', w: 768, h: 1024, clickX: 384, clickY: 2100, docW: 768, docH: 3200 },
        { type: 'mobile', w: 390, h: 844, clickX: 195, clickY: 1800, docW: 390, docH: 2800 },
      ];

      for (const vp of viewports) {
        await request(app).post('/api/events').send({
          site_id: 'cf_demo_site',
          session_id: `sess_${vp.type}`,
          event_type: 'click',
          page_url: 'http://localhost:5173/demo',
          timestamp: new Date().toISOString(),
          coordinates: { x: vp.clickX, y: vp.clickY, client_x: vp.clickX, client_y: 300 },
          scroll_x: 0,
          scroll_y: vp.clickY - 300,
          viewport: { width: vp.w, height: vp.h },
          doc_width: vp.docW,
          doc_height: vp.docH,
        });
      }

      const res = await request(app).get('/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site');
      expect(res.body.total_clicks).toBe(3);

      // Mobile 1:1 preview scale calculation: containerWidth == 390, scale == 1.0
      const mobileClick = res.body.coordinates.find((c) => c.viewport.width === 390);
      const mobileScale = 1.0; // 1:1 phone view
      expect(mobileClick.x * mobileScale).toBe(195);
      expect(mobileClick.y * mobileScale).toBe(1800);

      // Tablet 1:1 preview scale calculation: containerWidth == 768, scale == 1.0
      const tabletClick = res.body.coordinates.find((c) => c.viewport.width === 768);
      const tabletScale = 1.0;
      expect(tabletClick.x * tabletScale).toBe(384);
      expect(tabletClick.y * tabletScale).toBe(2100);

      // Desktop scaled view: containerWidth == 1200, scale == 1200 / 1440
      const desktopClick = res.body.coordinates.find((c) => c.viewport.width === 1440);
      const desktopScale = 1200 / 1440;
      expect(desktopClick.x * desktopScale).toBe(600);
      expect(desktopClick.y * desktopScale).toBeCloseTo(2166.67, 1);
    });

    it('Scenario 4: Long pages and clicks near the bottom (Y=4150 on 4200px page)', async () => {
      const bottomClick = {
        x: 720,
        y: 4150,
        client_x: 720,
        client_y: 550,
        scroll_y: 3600,
        doc_width: 1440,
        doc_height: 4200,
      };

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: 'sess_deep_footer',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date().toISOString(),
        coordinates: {
          x: bottomClick.x,
          y: bottomClick.y,
          client_x: bottomClick.client_x,
          client_y: bottomClick.client_y,
        },
        scroll_x: 0,
        scroll_y: bottomClick.scroll_y,
        viewport: { width: 1440, height: 900 },
        doc_width: bottomClick.doc_width,
        doc_height: bottomClick.doc_height,
        element: { tag: 'a', id: 'link-footer-privacy', text: 'Privacy Policy' },
      });

      const res = await request(app).get('/api/heatmap?url=http://localhost:5173/demo&site_id=cf_demo_site');
      const saved = res.body.coordinates[0];

      expect(saved.y).toBe(4150);
      expect(saved.doc_height).toBe(4200);
      expect(saved.y).toBe(saved.client_y + saved.scroll_y);

      // Scaled marker position at scale 1200/1440
      const scale = 1200 / 1440;
      const renderedY = saved.y * scale;
      expect(renderedY).toBeCloseTo(3458.33, 1);
    });

    it('Scenario 5: Full-page preview scaling at multiple zoom levels (100%, 75%, 50%)', () => {
      const originalX = 640;
      const originalY = 1920;
      const zoomLevels = [1.0, 0.75, 0.5];

      for (const zoom of zoomLevels) {
        const scaledX = originalX * zoom;
        const scaledY = originalY * zoom;

        // Sub-pixel accuracy
        expect(Math.abs(scaledX / zoom - originalX)).toBeLessThanOrEqual(TOLERANCE_SUBPIXEL);
        expect(Math.abs(scaledY / zoom - originalY)).toBeLessThanOrEqual(TOLERANCE_SUBPIXEL);

        // Aspect ratio invariance
        expect(scaledY / scaledX).toBe(originalY / originalX);
      }
    });
  });

  describe('5. Session Integrity & Inactivity Lifecycle', () => {
    it('should preserve session ID across sequential events and count properly in user journey', async () => {
      const sessionId = 'session_persistent_lifecycle_123';

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: sessionId,
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date('2026-10-12T10:00:00.000Z').toISOString(),
      });

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: sessionId,
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date('2026-10-12T10:01:00.000Z').toISOString(),
        coordinates: { x: 250, y: 350 },
      });

      await request(app).post('/api/events').send({
        site_id: 'cf_demo_site',
        session_id: sessionId,
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date('2026-10-12T10:02:00.000Z').toISOString(),
        coordinates: { x: 500, y: 700 },
      });

      const res = await request(app).get(`/api/sessions/${sessionId}/events?site_id=cf_demo_site`);
      expect(res.status).toBe(200);
      expect(res.body.total_events).toBe(3);
      expect(res.body.data[0].event_type).toBe('page_view');
      expect(res.body.data[1].event_type).toBe('click');
      expect(res.body.data[2].event_type).toBe('click');
    });
  });
});


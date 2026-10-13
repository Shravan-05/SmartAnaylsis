import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
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

describe('Health Check Endpoint', () => {
  it('GET /api/health should return 200 with database status connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services.database.status).toBe('connected');
  });
});

describe('Multi-Website Management - /api/sites', () => {
  it('GET /api/sites should list registered websites with stats', async () => {
    const res = await request(app).get('/api/sites');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((s) => s.site_id === 'cf_demo_site')).toBe(true);
  });

  it('POST /api/sites should register a new website', async () => {
    const res = await request(app).post('/api/sites').send({
      site_id: 'test_store',
      name: 'Test Online Store',
      domain: 'https://teststore.example.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.site_id).toBe('test_store');
  });

  it('POST /api/sites should reject duplicate site_id with 409 Conflict', async () => {
    const res = await request(app).post('/api/sites').send({
      site_id: 'test_store',
      name: 'Duplicate Store',
      domain: 'https://dup.example.com',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('Event Ingestion Endpoint - POST /api/events', () => {
  it('should reject missing session_id with 400 Bad Request', async () => {
    const res = await request(app).post('/api/events').send({
      event_type: 'page_view',
      page_url: 'http://localhost:5173/demo',
      timestamp: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.stringMatching(/session_id/)]));
  });

  it('should reject invalid event_type with 400 Bad Request', async () => {
    const res = await request(app).post('/api/events').send({
      session_id: 'session_test_1',
      event_type: 'hover', // invalid
      page_url: 'http://localhost:5173/demo',
      timestamp: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject click event missing coordinates with 400 Bad Request', async () => {
    const res = await request(app).post('/api/events').send({
      session_id: 'session_test_1',
      event_type: 'click',
      page_url: 'http://localhost:5173/demo',
      timestamp: new Date().toISOString(),
      // coordinates missing
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.stringMatching(/coordinates/)]));
  });

  it('should successfully persist valid page_view event with default site_id', async () => {
    const payload = {
      session_id: 'session_alpha',
      event_type: 'page_view',
      page_url: 'http://localhost:5173/demo',
      timestamp: '2026-10-12T10:00:00.000Z',
      coordinates: null,
    };

    const res = await request(app).post('/api/events').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session_id).toBe('session_alpha');
    expect(res.body.data.site_id).toBe('cf_demo_site');
    expect(res.body.data.event_type).toBe('page_view');
    expect(res.body.data.coordinates).toBeNull();
  });

  it('should successfully persist click event with custom site_id and viewport', async () => {
    const payload = {
      site_id: 'test_store',
      session_id: 'session_alpha',
      event_type: 'click',
      page_url: 'http://localhost:5173/demo',
      timestamp: '2026-10-12T10:01:00.000Z',
      coordinates: { x: 420, y: 280 },
      viewport: { width: 1440, height: 900 },
    };

    const res = await request(app).post('/api/events').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.site_id).toBe('test_store');
    expect(res.body.data.coordinates.x).toBe(420);
    expect(res.body.data.coordinates.y).toBe(280);
    expect(res.body.data.viewport.width).toBe(1440);
  });
});

describe('Session Management Endpoints', () => {
  beforeEach(async () => {
    await Event.create([
      {
        site_id: 'cf_demo_site',
        session_id: 'sess_1',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date('2026-10-12T10:00:00Z'),
        coordinates: null,
      },
      {
        site_id: 'cf_demo_site',
        session_id: 'sess_1',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date('2026-10-12T10:02:00Z'),
        coordinates: { x: 100, y: 150 },
      },
      {
        site_id: 'other_site',
        session_id: 'sess_2',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/about',
        timestamp: new Date('2026-10-12T10:05:00Z'),
        coordinates: null,
      },
    ]);
  });

  it('GET /api/sessions should return aggregated session summaries', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);

    expect(res.body.data[0].session_id).toBe('sess_2');
    expect(res.body.data[1].session_id).toBe('sess_1');

    const sess1 = res.body.data[1];
    expect(sess1.total_events).toBe(2);
    expect(sess1.page_views).toBe(1);
    expect(sess1.clicks).toBe(1);
  });

  it('GET /api/sessions?site_id=... should filter sessions by website', async () => {
    const res = await request(app).get('/api/sessions').query({ site_id: 'cf_demo_site' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].session_id).toBe('sess_1');
  });

  it('GET /api/sessions?search=... should safely handle special regex characters', async () => {
    const res = await request(app).get('/api/sessions').query({ search: 'sess_[' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Safely escaped without throwing regex syntax error
  });

  it('GET /api/sessions/:sessionId/events should return chronological events', async () => {
    const res = await request(app).get('/api/sessions/sess_1/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].event_type).toBe('page_view');
    expect(res.body.data[1].event_type).toBe('click');
    expect(res.body.data[1].coordinates).toEqual({ x: 100, y: 150 });
  });

  it('GET /api/sessions/:sessionId/events should return 404 for nonexistent session', async () => {
    const res = await request(app).get('/api/sessions/nonexistent_xyz/events');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Heatmap Endpoints', () => {
  beforeEach(async () => {
    await Event.create([
      {
        site_id: 'cf_demo_site',
        session_id: 'heat_sess',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date(),
        coordinates: { x: 300, y: 200 },
      },
      {
        site_id: 'other_site',
        session_id: 'heat_sess_2',
        event_type: 'click',
        page_url: 'http://localhost:5173/other-demo',
        timestamp: new Date(),
        coordinates: { x: 150, y: 120 },
      },
    ]);
  });

  it('GET /api/heatmap/pages should return distinct pages with clicks', async () => {
    const res = await request(app).get('/api/heatmap/pages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toContain('http://localhost:5173/demo');
    expect(res.body.data).toContain('http://localhost:5173/other-demo');
  });

  it('GET /api/heatmap/pages?site_id=... should filter pages by site', async () => {
    const res = await request(app).get('/api/heatmap/pages').query({ site_id: 'cf_demo_site' });
    expect(res.status).toBe(200);
    expect(res.body.data).toContain('http://localhost:5173/demo');
    expect(res.body.data).not.toContain('http://localhost:5173/other-demo');
  });

  it('GET /api/heatmap?url=PAGE_URL should return coordinates and count', async () => {
    const res = await request(app)
      .get('/api/heatmap')
      .query({ url: 'http://localhost:5173/demo' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_clicks).toBe(1);
    expect(res.body.coordinates.length).toBe(1);
    expect(res.body.coordinates[0]).toHaveProperty('x');
    expect(res.body.coordinates[0]).toHaveProperty('y');
  });

  it('GET /api/heatmap should return 400 when url query param is missing', async () => {
    const res = await request(app).get('/api/heatmap');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Analytics Overview Stats Endpoint - GET /api/events/stats', () => {
  beforeEach(async () => {
    await Event.create([
      {
        site_id: 'cf_demo_site',
        session_id: 'stat_sess_1',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date(),
        coordinates: null,
      },
      {
        site_id: 'cf_demo_site',
        session_id: 'stat_sess_1',
        event_type: 'click',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date(),
        coordinates: { x: 250, y: 350 },
      },
    ]);
  });

  it('GET /api/events/stats should return comprehensive counts and trend', async () => {
    const res = await request(app).get('/api/events/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalEvents).toBe(2);
    expect(res.body.data.totalPageViews).toBe(1);
    expect(res.body.data.totalClicks).toBe(1);
    expect(res.body.data.totalSessions).toBe(1);
    expect(Array.isArray(res.body.data.activityTrend)).toBe(true);
    expect(Array.isArray(res.body.data.topPages)).toBe(true);
  });

  it('GET /api/events/stats?time_range=24h should filter by time window', async () => {
    const res = await request(app).get('/api/events/stats').query({ time_range: '24h', site_id: 'cf_demo_site' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.time_range).toBe('24h');
    expect(res.body.data.totalEvents).toBe(2);
  });

  it('GET /api/events/stats with custom date range and grouping should calculate correctly', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 3600000).toISOString();
    const end = new Date(now.getTime() + 3600000).toISOString();

    const res = await request(app).get('/api/events/stats').query({
      site_id: 'cf_demo_site',
      time_range: 'custom',
      startDate: start,
      endDate: end,
      group_by: 'hourly',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grouping).toBe('hourly');
    expect(res.body.data.totalEvents).toBe(2);
  });

  it('GET /api/events/stats should reject invalid custom date ranges with 400', async () => {
    const res = await request(app).get('/api/events/stats').query({
      site_id: 'cf_demo_site',
      time_range: 'custom',
      startDate: '2026-10-15',
      endDate: '2026-10-10', // start is after end
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Real-Time Live Events Endpoints', () => {
  it('GET /api/events/recent should return latest events for live panel', async () => {
    await Event.create({
      site_id: 'cf_demo_site',
      session_id: 'sess_live_1',
      event_type: 'page_view',
      page_url: 'http://localhost:5173/demo',
      timestamp: new Date(),
    });

    const res = await request(app).get('/api/events/recent').query({ site_id: 'cf_demo_site' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].session_id).toBe('sess_live_1');
  });
});

describe('Scoped Reset Analytics Endpoint - DELETE /api/seed', () => {
  beforeEach(async () => {
    await Event.create([
      {
        site_id: 'cf_demo_site',
        session_id: 'sess_cf_1',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo',
        timestamp: new Date(),
      },
      {
        site_id: 'other_client_site',
        session_id: 'sess_other_1',
        event_type: 'page_view',
        page_url: 'https://otherclient.com',
        timestamp: new Date(),
      },
    ]);
  });

  it('DELETE /api/seed should only delete target site events and preserve unrelated data', async () => {
    const res = await request(app).delete('/api/seed').query({ site_id: 'cf_demo_site' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.site_id).toBe('cf_demo_site');
    expect(res.body.deletedCount).toBe(1);

    // Verify other_client_site event still exists in MongoDB
    const remainingEvents = await Event.find({ site_id: 'other_client_site' });
    expect(remainingEvents.length).toBe(1);

    // Verify website registrations are preserved in Site collection
    const sites = await Site.find({});
    expect(sites.length).toBeGreaterThanOrEqual(1);
  });
});


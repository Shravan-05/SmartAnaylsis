import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import Event from '../src/models/Event.js';
import Site, { ensureDefaultSite } from '../src/models/Site.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  parseTimestamp,
  normalizeUrl,
  resolveDateRange,
  resolveGrouping,
  fillMissingBuckets,
  zonedToUtc,
  getZonedParts,
} from '../src/utils/dateFilter.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_analytics_test';

beforeAll(async () => {
  await connectDB(TEST_MONGO_URI);
  await ensureDefaultSite();
});

afterAll(async () => {
  await Event.deleteMany({});
  await disconnectDB();
});

beforeEach(async () => {
  await Event.deleteMany({});
});

describe('Phase 2: Timestamp Parsing, Timezone & Zero-Filling Unit Tests', () => {
  it('should parse Unix seconds (10 digits) without mistaking them for 1970 milliseconds', () => {
    // 1791782400 is in year 2026
    const parsed = parseTimestamp(1791782400);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.toISOString()).toContain('2026');
  });

  it('should parse numeric string Unix seconds without mistaking them for 1970', () => {
    const parsed = parseTimestamp('1791782400');
    expect(parsed.getFullYear()).toBe(2026);
  });

  it('should parse Unix milliseconds (13 digits)', () => {
    const parsed = parseTimestamp(1791782400000);
    expect(parsed.getFullYear()).toBe(2026);
  });

  it('should parse ISO-8601 strings accurately', () => {
    const parsed = parseTimestamp('2026-10-12T08:15:00.000Z');
    expect(parsed.toISOString()).toBe('2026-10-12T08:15:00.000Z');
  });

  it('should accurately convert Asia/Kolkata midnight to UTC', () => {
    // Midnight on Oct 12, 2026 in Asia/Kolkata (+05:30) is 18:30 UTC on Oct 11, 2026
    const utcMidnight = zonedToUtc(2026, 10, 12, 0, 0, 0, 0, 'Asia/Kolkata');
    expect(utcMidnight.toISOString()).toBe('2026-10-11T18:30:00.000Z');

    const parts = getZonedParts(utcMidnight, 'Asia/Kolkata');
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(12);
    expect(parts.hour).toBe(0);
  });

  it('should correctly distinguish events immediately before and after midnight in Asia/Kolkata', () => {
    // 1 ms before midnight Oct 12 IST: 2026-10-11T18:29:59.999Z
    const beforeMidnight = new Date('2026-10-11T18:29:59.999Z');
    const partsBefore = getZonedParts(beforeMidnight, 'Asia/Kolkata');
    expect(partsBefore.day).toBe(11);
    expect(partsBefore.hour).toBe(23);
    expect(partsBefore.minute).toBe(59);

    // At midnight Oct 12 IST: 2026-10-11T18:30:00.000Z
    const atMidnight = new Date('2026-10-11T18:30:00.000Z');
    const partsAt = getZonedParts(atMidnight, 'Asia/Kolkata');
    expect(partsAt.day).toBe(12);
    expect(partsAt.hour).toBe(0);
    expect(partsAt.minute).toBe(0);
  });

  it('should handle leap year February (2024) with exactly 29 days', () => {
    const start = zonedToUtc(2024, 2, 1, 0, 0, 0, 0, 'Asia/Kolkata');
    const end = zonedToUtc(2024, 3, 1, 0, 0, 0, 0, 'Asia/Kolkata');
    const filled = fillMissingBuckets({ start, end, grouping: 'daily', timezone: 'Asia/Kolkata', dbTrend: [] });
    expect(filled.length).toBe(29);
    expect(filled[0].time).toBe('2024-02-01');
    expect(filled[28].time).toBe('2024-02-29');
  });

  it('should normalize URLs by stripping hash anchors and trailing slashes while preserving queries', () => {
    expect(normalizeUrl('http://localhost:5173/demo/')).toBe('http://localhost:5173/demo');
    expect(normalizeUrl('http://localhost:5173/demo#pricing')).toBe('http://localhost:5173/demo');
    expect(normalizeUrl('http://localhost:5173/demo/#pricing')).toBe('http://localhost:5173/demo');
    expect(normalizeUrl('http://localhost:5173/demo?ref=banner')).toBe('http://localhost:5173/demo?ref=banner');
  });

  it('should zero-fill hourly intervals for Today without fabricating event counts', () => {
    const start = zonedToUtc(2026, 10, 12, 0, 0, 0, 0, 'Asia/Kolkata');
    const end = zonedToUtc(2026, 10, 13, 0, 0, 0, 0, 'Asia/Kolkata');
    const dbTrend = [{ time: '2026-10-12 13:00', page_views: 1, clicks: 2, events: 3 }];

    const filled = fillMissingBuckets({ start, end, grouping: 'hourly', timezone: 'Asia/Kolkata', dbTrend });
    expect(filled.length).toBe(24);
    expect(filled[0].time).toBe('2026-10-12 00:00');
    expect(filled[0].events).toBe(0);
    expect(filled[13].time).toBe('2026-10-12 13:00');
    expect(filled[13].events).toBe(3);
    expect(filled[13].clicks).toBe(2);
    expect(filled[13].page_views).toBe(1);
    expect(filled[23].time).toBe('2026-10-12 23:00');
    expect(filled[23].events).toBe(0);
  });
});

describe('Phase 3 & 4: API Analytics, Heatmap Filtering & Site Isolation', () => {
  it('POST /api/events should accept Unix seconds and store valid UTC Date', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        site_id: 'cf_demo_site',
        session_id: 'sess_unix_test',
        event_type: 'page_view',
        page_url: 'http://localhost:5173/demo/',
        timestamp: 1791782400, // Unix seconds
      });

    expect(res.status).toBe(201);
    const stored = await Event.findOne({ session_id: 'sess_unix_test' });
    expect(stored).not.toBeNull();
    expect(stored.timestamp.getFullYear()).toBe(2026);
    expect(stored.page_url).toBe('http://localhost:5173/demo'); // Normalized
  });

  it('GET /api/events/stats should return 24 hourly zero-filled buckets for today in Asia/Kolkata', async () => {
    // Ingest 1 click event at 13:00 IST on current date
    const nowParts = getZonedParts(new Date(), 'Asia/Kolkata');
    const eventTime = zonedToUtc(nowParts.year, nowParts.month, nowParts.day, 13, 0, 0, 0, 'Asia/Kolkata');

    await Event.create({
      site_id: 'cf_demo_site',
      session_id: 'sess_stat_test',
      event_type: 'click',
      page_url: 'http://localhost:5173/demo',
      timestamp: eventTime,
      coordinates: { x: 100, y: 200 },
    });

    const res = await request(app)
      .get('/api/events/stats')
      .query({ site_id: 'cf_demo_site', time_range: 'today', timezone: 'Asia/Kolkata' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalEvents).toBe(1);
    expect(res.body.data.totalClicks).toBe(1);
    expect(res.body.data.grouping).toBe('hourly');
    expect(Array.isArray(res.body.data.activityTrend)).toBe(true);
    expect(res.body.data.activityTrend.length).toBe(24);

    const hour13 = res.body.data.activityTrend.find((b) => b.time.includes('13:00'));
    expect(hour13).toBeDefined();
    expect(hour13.clicks).toBe(1);

    const hour0 = res.body.data.activityTrend.find((b) => b.time.includes('00:00'));
    expect(hour0).toBeDefined();
    expect(hour0.events).toBe(0);
  });

  it('GET /api/events/stats should return 400 for invalid custom date range (start > end)', async () => {
    const res = await request(app)
      .get('/api/events/stats')
      .query({
        site_id: 'cf_demo_site',
        time_range: 'custom',
        startDate: '2026-10-15',
        endDate: '2026-10-10',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/events/stats should respect multi-website site isolation', async () => {
    const now = new Date();
    // Event for ApexCloud
    await Event.create({
      site_id: 'cf_demo_site',
      session_id: 'sess_apex',
      event_type: 'page_view',
      page_url: 'http://localhost:5173/demo',
      timestamp: now,
    });
    // Event for another site
    await Event.create({
      site_id: 'other_store',
      session_id: 'sess_other',
      event_type: 'page_view',
      page_url: 'https://otherstore.com/shop',
      timestamp: now,
    });

    const resApex = await request(app)
      .get('/api/events/stats')
      .query({ site_id: 'cf_demo_site', time_range: 'all' });

    expect(resApex.status).toBe(200);
    expect(resApex.body.data.totalEvents).toBe(1);

    const resOther = await request(app)
      .get('/api/events/stats')
      .query({ site_id: 'other_store', time_range: 'all' });

    expect(resOther.status).toBe(200);
    expect(resOther.body.data.totalEvents).toBe(1);
  });

  it('GET /api/heatmap should match normalized URLs regardless of trailing slash or hash', async () => {
    const now = new Date();
    await Event.create({
      site_id: 'cf_demo_site',
      session_id: 'sess_heat_1',
      event_type: 'click',
      page_url: 'http://localhost:5173/demo',
      timestamp: now,
      coordinates: { x: 150, y: 250 },
    });

    // Query with trailing slash
    const res = await request(app)
      .get('/api/heatmap')
      .query({
        url: 'http://localhost:5173/demo/',
        site_id: 'cf_demo_site',
        time_range: 'all',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total_clicks).toBe(1);
    expect(res.body.coordinates[0].x).toBe(150);
    expect(res.body.coordinates[0].y).toBe(250);
  });

  it('GET /api/heatmap should return empty array when date filter excludes clicks', async () => {
    // Event from last year
    const oldDate = new Date('2025-01-15T10:00:00.000Z');
    await Event.create({
      site_id: 'cf_demo_site',
      session_id: 'sess_old_click',
      event_type: 'click',
      page_url: 'http://localhost:5173/demo',
      timestamp: oldDate,
      coordinates: { x: 50, y: 75 },
    });

    // Query for Today in Asia/Kolkata
    const res = await request(app)
      .get('/api/heatmap')
      .query({
        url: 'http://localhost:5173/demo',
        site_id: 'cf_demo_site',
        time_range: 'today',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(200);
    expect(res.body.total_clicks).toBe(0);
    expect(res.body.coordinates.length).toBe(0);
  });
});

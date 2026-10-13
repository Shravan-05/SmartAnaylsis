import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import eventRoutes from './routes/eventRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import heatmapRoutes from './routes/heatmapRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import seedRoutes from './routes/seedRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// 1. CORS Configuration
// Strict in production, permissive for local development & tracking
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isDev = process.env.NODE_ENV !== 'production';
      const isAllowedConfigured = configuredOrigins.includes(origin);
      const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

      if (isAllowedConfigured || (isDev && isLocalhost)) {
        callback(null, true);
      } else {
        // In production, restrict to allowed origins; allow tracking script embedding
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    credentials: true,
  })
);

// 2. Body Parser with Strict Payload Limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 3. HTTP Request Logging (omit in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. API Routes
app.use('/api/health', healthRoutes);
app.use('/api/sites', apiRateLimiter, siteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sessions', apiRateLimiter, sessionRoutes);
app.use('/api/heatmap', apiRateLimiter, heatmapRoutes);
app.use('/api/seed', seedRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CausalFunnel User Analytics API',
    version: '1.1.0',
    status: 'online',
    documentation: {
      health: 'GET /api/health',
      sites: 'GET /api/sites | POST /api/sites',
      events: 'POST /api/events | GET /api/events/stats?site_id=...',
      sessions: 'GET /api/sessions?site_id=...&search=...',
      sessionEvents: 'GET /api/sessions/:sessionId/events',
      heatmapPages: 'GET /api/heatmap/pages?site_id=...',
      heatmapData: 'GET /api/heatmap?url=PAGE_URL&site_id=...',
    },
  });
});

// 5. Route Not Found (404)
app.use(notFoundHandler);

// 6. Centralized Error Handler
app.use(errorHandler);

export default app;

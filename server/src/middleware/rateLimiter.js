import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for incoming event ingestion (/api/events).
 * Allows generous throughput for realistic high-frequency click and scroll interactions
 * while protecting against DoS.
 */
export const eventsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 events per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many event submissions from this IP, please try again shortly.',
  },
});

/**
 * General API rate limiter for query endpoints (sessions, heatmap, dashboard stats).
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests, please try again later.',
  },
});

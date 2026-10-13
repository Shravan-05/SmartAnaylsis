import { Router } from 'express';
import { createEvent, getStatsSummary, streamEvents, getRecentEvents } from '../controllers/eventController.js';
import { validateEvent } from '../middleware/validate.js';
import { eventsRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Ingest new tracking event with rate limiting and strict validation
router.post('/', eventsRateLimiter, validateEvent, createEvent);

// High-level overview dashboard statistics
router.get('/stats', getStatsSummary);

// Real-time Server-Sent Events stream
router.get('/live', streamEvents);

// Recent real events for live feed panel hydration
router.get('/recent', getRecentEvents);

export default router;

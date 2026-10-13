import { Router } from 'express';
import { getSessions, getSessionEvents } from '../controllers/sessionController.js';

const router = Router();

// Paginated sessions list sorted by last activity
router.get('/', getSessions);

// Chronological event journey for a specific session
router.get('/:sessionId/events', getSessionEvents);

export default router;

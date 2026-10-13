import { Router } from 'express';
import { seedDemoData, clearDemoData } from '../controllers/seedController.js';

const router = Router();

// Seed realistic test sessions and events
router.post('/', seedDemoData);

// Clear event data
router.delete('/', clearDemoData);

export default router;

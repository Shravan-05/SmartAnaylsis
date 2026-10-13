import { Router } from 'express';
import { getHeatmapPages, getHeatmapData } from '../controllers/heatmapController.js';

const router = Router();

// Distinct page URLs with recorded click events
router.get('/pages', getHeatmapPages);

// Click coordinates and total count for a given page URL (?url=...)
router.get('/', getHeatmapData);

export default router;

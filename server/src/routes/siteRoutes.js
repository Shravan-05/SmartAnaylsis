import { Router } from 'express';
import { getSites, createSite, getSiteById } from '../controllers/siteController.js';

const router = Router();

router.get('/', getSites);
router.post('/', createSite);
router.get('/:siteId', getSiteById);

export default router;

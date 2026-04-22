import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { StatsController } from '../controllers/statsController';

const router = Router();

// GET /api/stats/me - returns role-specific dashboard statistics
router.get('/me', authenticate, StatsController.getUserStats);

export default router;

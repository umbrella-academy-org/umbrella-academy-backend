import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { StatsController } from '../controllers/statsController';

const router = Router();

// GET /api/stats/me - returns role-specific dashboard statistics
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
router.get('/me', authenticate, StatsController.getUserStats);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AdminController } from '../controllers/adminController';

const router = Router();

// GET /api/admin/analytics — platform-wide stats (Requirement 10.8)
router.get('/analytics', authenticate, requireRole('admin'), AdminController.getAnalytics);

export default router;

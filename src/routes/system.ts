import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { SystemController } from '../controllers/systemController';

const router = Router();

// GET /api/system - returns system health metrics, alerts, and service statuses
router.get('/', authenticate, requireRole('admin'), SystemController.getSystemHealth);

// GET /api/system/database - get database statistics
router.get('/database', authenticate, requireRole('admin'), SystemController.getDatabaseStats);

// GET /api/system/memory - get memory usage statistics
router.get('/memory', authenticate, requireRole('admin'), SystemController.getMemoryUsage);

export default router;

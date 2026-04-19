import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AdminController } from '../controllers/adminController';

const router = Router();

// GET /api/admin/analytics — platform-wide stats (Requirement 10.8)
router.get('/analytics', authenticate, requireRole('admin'), AdminController.getAnalytics);

// Trainer approval endpoints
// GET /api/admin/trainers/pending - get pending trainer applications
router.get('/trainers/pending', authenticate, requireRole('admin'), AdminController.getPendingTrainers);

// GET /api/admin/trainers - get all trainers with approval status
router.get('/trainers', authenticate, requireRole('admin'), AdminController.getAllTrainers);

// POST /api/admin/trainers/:trainerId/approve - approve trainer application
router.post('/trainers/:trainerId/approve', authenticate, requireRole('admin'), AdminController.approveTrainer);

// POST /api/admin/trainers/:trainerId/reject - reject trainer application
router.post('/trainers/:trainerId/reject', authenticate, requireRole('admin'), AdminController.rejectTrainer);

// DELETE /api/admin/trainers/:trainerId - delete trainer account
router.delete('/trainers/:trainerId', authenticate, requireRole('admin'), AdminController.deleteTrainer);

export default router;

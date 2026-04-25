import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { GuardianController } from '../controllers/guardianController';

const router = Router();

// Public routes (no authentication required)
// POST /api/guardian/invite/verify - Verify invitation token
router.post('/invite/verify', GuardianController.verifyInvitation);

// POST /api/guardian/set-password - Set password and accept invitation
router.post('/set-password', GuardianController.setPassword);

// POST /api/guardian/login - Guardian login
router.post('/login', GuardianController.login);

// POST /api/guardian/invite/decline - Decline invitation
router.post('/invite/decline', GuardianController.declineInvitation);

// Protected routes (guardian authentication required)
// GET /api/guardian/students - Get all linked students
router.get('/students', authenticate, requireRole('guardian'), GuardianController.getLinkedStudents);

// GET /api/guardian/students/:studentId - Get specific student details
router.get('/students/:studentId', authenticate, requireRole('guardian'), GuardianController.getStudentDetails);

// Admin only routes
// POST /api/guardian/invite/resend - Resend invitation
router.post('/invite/resend', authenticate, requireRole('admin'), GuardianController.resendInvitation);

export default router;

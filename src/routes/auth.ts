import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthController } from '../controllers/authController';

const router = Router();

// POST /api/auth/register/student
router.post('/register/student', AuthController.registerStudent);

// POST /api/auth/register/trainer
router.post('/register/trainer', AuthController.registerTrainer);

// POST /api/auth/send-otp
router.post('/send-otp', AuthController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', AuthController.verifyOtp);

// POST /api/auth/resend-otp
router.post('/resend-otp', AuthController.resendOtp);

// POST /api/auth/forgot-password
router.post('/forgot-password', AuthController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', AuthController.resetPassword);

// POST /api/auth/login
router.post('/login', AuthController.login);

router.get('/onboarding-checklist', authenticate, AuthController.getOnboardingChecklist);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { PaymentController } from '../controllers/paymentController';

const router = Router();

// Student payment endpoints
// POST /payments/orientation - initiate orientation payment
router.post('/orientation', authenticate, requireRole('student'), PaymentController.initiateOrientationPayment);

// POST /payments/subscription - initiate subscription payment
router.post('/subscription', authenticate, requireRole('student'), PaymentController.initiateSubscriptionPayment);

// GET /payments/status - get payment status for current user
router.get('/status', authenticate, requireRole('student'), PaymentController.getPaymentStatus);

// GET /payments/subscription - get subscription status for current user
router.get('/subscription', authenticate, requireRole('student'), PaymentController.getSubscriptionStatus);

// GET /payments/history - get payment history for current user
router.get('/history', authenticate, requireRole('student'), PaymentController.getPaymentHistory);

// Payment confirmation endpoint (webhook)
// POST /payments/confirm - confirm payment (no auth required for webhooks)
router.post('/confirm', PaymentController.confirmPayment);


export default router;

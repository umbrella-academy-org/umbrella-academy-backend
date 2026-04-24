import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { PromoCodeController } from '../controllers/promoCodeController';

const router = Router();

// Student routes for promo code usage
// POST /api/promo-codes/validate - Validate a promo code (for students)
router.post('/validate', authenticate, requireRole('student'), PromoCodeController.validatePromoCode);

// POST /api/promo-codes/apply - Apply a promo code (mark as used)
router.post('/apply', authenticate, requireRole('student'), PromoCodeController.applyPromoCode);

export default router;

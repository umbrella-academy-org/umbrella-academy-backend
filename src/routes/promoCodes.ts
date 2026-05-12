import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { PromoCodeController } from '../controllers/promoCodeController';

const router = Router();

// Admin routes for promo code management
// POST /api/admin/promo-codes - Create a new promo code
router.post('/', authenticate, requireRole('admin'), PromoCodeController.createPromoCode);

// GET /api/admin/promo-codes - Get all promo codes with optional filters
router.get('/', authenticate, requireRole('admin'), PromoCodeController.getAllPromoCodes);

// GET /api/admin/promo-codes/stats - Get promo code statistics
router.get('/stats', authenticate, requireRole('admin'), PromoCodeController.getPromoCodeStats);

// GET /api/admin/promo-codes/:code - Get a single promo code by code
router.get('/:code', authenticate, requireRole('admin'), PromoCodeController.getPromoCodeByCode);

// PUT /api/admin/promo-codes/:code - Update a promo code
router.put('/:code', authenticate, requireRole('admin'), PromoCodeController.updatePromoCode);

// DELETE /api/admin/promo-codes/:code - Delete a promo code
router.delete('/:code', authenticate, requireRole('admin'), PromoCodeController.deletePromoCode);

export default router;

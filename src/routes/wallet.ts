import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import Wallet from '../models/Wallet';
import { Types } from 'mongoose';

const router = Router();

// GET /api/wallet/me — trainer or field-admin retrieves their own wallet
// Requirements: 7.1, 7.2, 7.6
router.get(
  '/me',
  authenticate,
  requireRole('trainer', 'field-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role, fieldId } = req.user!;

      let wallet;

      if (role === 'trainer') {
        wallet = await Wallet.findOne({
          ownerId: new Types.ObjectId(userId),
          ownerType: 'trainer',
        });
      } else {
        // field-admin
        if (!fieldId) {
          res.status(400).json({ success: false, message: 'No fieldId associated with this user' });
          return;
        }
        wallet = await Wallet.findOne({
          ownerId: new Types.ObjectId(fieldId),
          ownerType: 'field',
        });
      }

      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      res.json({ success: true, data: wallet });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/wallet — umbrella-admin retrieves all wallets
// Requirements: 7.3
router.get(
  '/',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallets = await Wallet.find();
      res.json({ success: true, data: wallets });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

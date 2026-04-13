import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import Wallet from '../models/Wallet';
import { Types } from 'mongoose';

const router = Router();

// GET /api/wallet/me — trainer retrieves their own wallet
// Requirements: 7.1, 7.2, 7.6
router.get(
  '/me',
  authenticate,
  requireRole('trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;

      const wallet = await Wallet.findOne({
        ownerId: new Types.ObjectId(userId),
        ownerType: 'trainer',
      });

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

// GET /api/wallet — admin retrieves all wallets
// Requirements: 7.3
router.get(
  '/',
  authenticate,
  requireRole('admin'),
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

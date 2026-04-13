import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /trainers/pending — list pending trainers (Requirements 10.6)
router.get(
  '/pending',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter: Record<string, unknown> = {
        role: 'trainer',
        approvalStatus: 'pending',
      };

      // admin: no fieldId filter — returns all pending trainers

      const users = await User.find(filter).select('-password');

      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

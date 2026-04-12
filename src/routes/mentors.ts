import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /mentors/pending — list pending mentors (Requirements 10.7)
router.get(
  '/pending',
  authenticate,
  requireRole('field-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter: Record<string, unknown> = {
        role: 'mentor',
        approvalStatus: 'pending',
      };

      if (req.user!.role === 'field-admin') {
        filter.fieldId = req.user!.fieldId;
      }
      // umbrella-admin: no fieldId filter — returns all pending mentors

      const users = await User.find(filter).select('-password');

      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

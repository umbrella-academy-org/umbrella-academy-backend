import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// PUT /users/profile — student onboarding (Requirement 2.1)
router.put(
  '/profile',
  authenticate,
  requireRole('student'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fieldId, trainerId, mentorId, educationLevel, availability, learningPreferences } =
        req.body;

      const updated = await User.findByIdAndUpdate(
        req.user!.userId,
        { fieldId, trainerId, mentorId, educationLevel, availability, learningPreferences },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// GET /users — admin scoped (Requirements 8.1–8.4, 8.6)
router.get(
  '/',
  authenticate,
  requireRole('field-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = req.query as { role?: string };

      const filter: Record<string, unknown> = {};

      if (role) {
        filter.role = role;
      }

      if (req.user!.role === 'field-admin') {
        filter.fieldId = req.user!.fieldId;
      }
      // umbrella-admin: no fieldId filter — returns all

      const users = await User.find(filter).select('-password');

      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /users/:id/status — update user status (Requirements 8.5, 8.6)
router.put(
  '/:id/status',
  authenticate,
  requireRole('field-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.body as { status: 'active' | 'inactive' | 'suspended' };

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status value' });
        return;
      }

      const updated = await User.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

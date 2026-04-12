import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
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

// POST /users — create user (Requirements 10.1)
router.post(
  '/',
  authenticate,
  requireRole('umbrella-admin', 'field-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, role, firstName, lastName, fieldId } = req.body as {
        email?: string;
        password?: string;
        role?: string;
        firstName?: string;
        lastName?: string;
        fieldId?: string;
      };

      if (!email || !password || !role || !firstName || !lastName) {
        res.status(400).json({ success: false, message: 'email, password, role, firstName, and lastName are required' });
        return;
      }

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(400).json({ success: false, message: 'A user with that email already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        fieldId: fieldId ?? '',
        status: 'active',
        isVerified: true,
      });

      const userWithoutPassword = await User.findById(user._id).select('-password');
      res.status(201).json({ success: true, data: userWithoutPassword });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /users/:id — update user profile (Requirements 10.2)
router.put(
  '/:id',
  authenticate,
  requireRole('umbrella-admin', 'field-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Disallow password updates through this endpoint
      const { password: _password, ...updateFields } = req.body;

      const updated = await User.findByIdAndUpdate(
        req.params.id,
        updateFields,
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

// DELETE /users/:id — delete user (Requirements 10.3)
router.delete(
  '/:id',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const target = await User.findById(req.params.id);

      if (!target) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      if (target.role === 'umbrella-admin') {
        res.status(403).json({ success: false, message: 'Cannot delete an umbrella-admin account' });
        return;
      }

      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;


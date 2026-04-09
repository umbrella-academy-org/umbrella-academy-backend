import { Router, Request, Response, NextFunction } from 'express';
import Field from '../models/Field';
import User from '../models/User';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/fields — public, no auth required
// Requirements 2.2, 2.6
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await Field.find({ isActive: true }).select(
      '_id name slug description icon monthlyPrice specializations isActive'
    );
    res.json({ success: true, data: fields });
  } catch (err) {
    next(err);
  }
});

// GET /api/fields/:id/trainers — requires auth
// Requirements 2.3
router.get('/:id/trainers', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainers = await User.find({
      role: 'trainer',
      fieldId: req.params.id,
      status: 'active',
    }).select('-password');
    res.json({ success: true, data: trainers });
  } catch (err) {
    next(err);
  }
});

// GET /api/fields/:id/mentors — requires auth
// Requirements 2.4
router.get('/:id/mentors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mentors = await User.find({
      role: 'mentor',
      fieldId: req.params.id,
      status: 'active',
    }).select('-password');
    res.json({ success: true, data: mentors });
  } catch (err) {
    next(err);
  }
});

// GET /api/fields/:id/companies — requires auth
// For MVP: returns field-admin users associated with the field
// Requirements 2.5
router.get('/:id/companies', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await User.find({
      role: 'field-admin',
      fieldId: req.params.id,
      status: 'active',
    }).select('-password');
    res.json({ success: true, data: companies });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import Company from '../models/Company';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/companies — list all companies (public for auth users)
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await Company.find({ isActive: true })
        .populate('mentorId', 'firstName lastName email')
        .sort({ name: 1 });
      res.json({ success: true, data: companies });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/companies/all — all companies including inactive (umbrella-admin only)
router.get(
  '/all',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companies = await Company.find({})
        .populate('mentorId', 'firstName lastName email')
        .sort({ name: 1 });

      // Enrich with user counts
      const enriched = await Promise.all(
        companies.map(async (company) => {
          const companyIdStr = (company._id as any).toString();
          const [studentsCount, trainersCount, mentorsCount] = await Promise.all([
            User.countDocuments({ role: 'student', companyId: companyIdStr }),
            User.countDocuments({ role: 'trainer', companyId: companyIdStr }),
            User.countDocuments({ role: 'mentor', companyId: companyIdStr }),
          ]);
          return {
            _id: companyIdStr,
            name: company.name,
            description: company.description,
            website: company.website,
            logo: company.logo,
            fields: company.fields,
            mentorId: company.mentorId,
            isActive: company.isActive,
            createdAt: company.createdAt,
            studentsCount,
            trainersCount,
            mentorsCount,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/companies — create company (umbrella-admin only)
router.post(
  '/',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, website, logo, fields } = req.body as {
        name?: string;
        description?: string;
        website?: string;
        logo?: string;
        fields?: string[];
      };

      if (!name || name.trim() === '') {
        res.status(400).json({ success: false, message: 'Company name is required' });
        return;
      }

      const company = await Company.create({
        name: name.trim(),
        description,
        website,
        logo,
        fields: fields ?? [],
      });

      res.status(201).json({ success: true, data: company });
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(400).json({ success: false, message: 'A company with that name already exists' });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/companies/:id — update company (umbrella-admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password: _p, ...updateFields } = req.body;

      const updated = await Company.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true, runValidators: true }
      ).populate('mentorId', 'firstName lastName email');

      if (!updated) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/companies/:id — delete company (umbrella-admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await Company.findByIdAndDelete(req.params.id);
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/companies/:id/assign-mentor — assign a mentor to a company
router.post(
  '/:id/assign-mentor',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mentorId } = req.body as { mentorId?: string };

      if (!mentorId) {
        res.status(400).json({ success: false, message: 'mentorId is required' });
        return;
      }

      const mentor = await User.findById(mentorId);
      if (!mentor || mentor.role !== 'mentor') {
        res.status(404).json({ success: false, message: 'Mentor not found' });
        return;
      }

      const updated = await Company.findByIdAndUpdate(
        req.params.id,
        { mentorId },
        { new: true }
      ).populate('mentorId', 'firstName lastName email');

      if (!updated) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      // Also set companyId on the mentor user
      await User.findByIdAndUpdate(mentorId, { companyId: req.params.id });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

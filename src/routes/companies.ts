import { Router, Request, Response, NextFunction } from 'express';
import Company from '../models/Company';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/companies — list active companies (authenticated)
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companies = await Company.find({ isActive: true })
      .populate('adminId', 'firstName lastName email')
      .sort({ name: 1 });
    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
});

// GET /api/companies/all — enriched list (umbrella-admin only)
router.get('/all', authenticate, requireRole('umbrella-admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companies = await Company.find({})
      .populate('adminId', 'firstName lastName email')
      .sort({ name: 1 });

    const enriched = await Promise.all(companies.map(async (company) => {
      const id = (company._id as any).toString();
      const [studentsCount, trainersCount] = await Promise.all([
        User.countDocuments({ role: 'student', companyId: id }),
        User.countDocuments({ role: 'trainer', companyId: id }),
      ]);
      return {
        _id: id,
        name: company.name,
        description: company.description,
        website: company.website,
        logo: company.logo,
        fields: company.fields,
        adminId: company.adminId,
        isActive: company.isActive,
        createdAt: company.createdAt,
        studentsCount,
        trainersCount,
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});

// POST /api/companies — create (umbrella-admin only)
router.post('/', authenticate, requireRole('umbrella-admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, website, logo, fields } = req.body as {
      name?: string; description?: string; website?: string; logo?: string; fields?: string[];
    };

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Company name is required' });
      return;
    }

    const company = await Company.create({ name: name.trim(), description, website, logo, fields: fields ?? [] });
    res.status(201).json({ success: true, data: company });
  } catch (err: any) {
    if (err.code === 11000) { res.status(400).json({ success: false, message: 'A company with that name already exists' }); return; }
    next(err);
  }
});

// PUT /api/companies/:id — update (umbrella-admin only)
router.put('/:id', authenticate, requireRole('umbrella-admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password: _p, ...updateFields } = req.body;
    const updated = await Company.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true })
      .populate('adminId', 'firstName lastName email');
    if (!updated) { res.status(404).json({ success: false, message: 'Company not found' }); return; }
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/companies/:id — delete (umbrella-admin only)
router.delete('/:id', authenticate, requireRole('umbrella-admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) { res.status(404).json({ success: false, message: 'Company not found' }); return; }
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

// POST /api/companies/:id/assign-admin — assign company-admin (umbrella-admin only)
router.post('/:id/assign-admin', authenticate, requireRole('umbrella-admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { adminId } = req.body as { adminId?: string };
    if (!adminId) { res.status(400).json({ success: false, message: 'adminId is required' }); return; }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'company-admin') {
      res.status(404).json({ success: false, message: 'Company admin not found' });
      return;
    }

    const updated = await Company.findByIdAndUpdate(req.params.id, { adminId }, { new: true })
      .populate('adminId', 'firstName lastName email');
    if (!updated) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    await User.findByIdAndUpdate(adminId, { companyId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;

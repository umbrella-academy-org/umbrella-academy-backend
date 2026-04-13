import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import User from '../models/User';
import Payment from '../models/Payment';
import Roadmap from '../models/Roadmap';
import LiveSession from '../models/LiveSession';
import FeedbackTicket from '../models/FeedbackTicket';

const router = Router();

// GET /api/admin/analytics — platform-wide stats (Requirement 10.8)
router.get(
  '/analytics',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User counts by role
      const [studentCount, trainerCount] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'trainer' }),
      ]);

      // Total revenue from completed payments
      const totalRevenueAgg = await Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

      // Monthly revenue (current calendar month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenueAgg = await Payment.aggregate([
        { $match: { status: 'completed', processedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const monthlyRevenue = monthlyRevenueAgg[0]?.total ?? 0;

      // Active roadmaps
      const activeRoadmaps = await Roadmap.countDocuments({ status: 'active' });

      // Completed live sessions
      const completedSessions = await LiveSession.countDocuments({ status: 'completed' });

      res.json({
        success: true,
        data: {
          usersByRole: {
            student: studentCount,
            trainer: trainerCount,
          },
          totalRevenue,
          monthlyRevenue,
          activeRoadmaps,
          completedSessions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/feedback — list all tickets sorted by createdAt desc (Requirement 10.9)
router.get(
  '/feedback',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tickets = await FeedbackTicket.find({})
        .sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName email role');

      res.json({ success: true, data: tickets });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/admin/feedback/:id — update ticket status (Requirement 10.10)
router.patch(
  '/feedback/:id',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.body as { status?: string };

      const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid or missing status value' });
        return;
      }

      const updated = await FeedbackTicket.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Feedback ticket not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/feedback/:id/response — set adminResponse (Requirement 10.11)
router.post(
  '/feedback/:id/response',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { response } = req.body as { response?: string };

      if (!response || response.trim() === '') {
        res.status(400).json({ success: false, message: 'response is required' });
        return;
      }

      const updated = await FeedbackTicket.findByIdAndUpdate(
        req.params.id,
        { adminResponse: response },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Feedback ticket not found' });
        return;
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

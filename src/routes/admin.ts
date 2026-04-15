import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import User from '../models/User';
import Payment from '../models/Payment';
import Roadmap from '../models/Roadmap';
import LiveSession from '../models/LiveSession';

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




export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserModel } from '../models/User';
import { PaymentModel } from '../models/Payment';
import { RoadmapModel } from '../models/Roadmap';

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
        UserModel.countDocuments({ role: 'student' }),
        UserModel.countDocuments({ role: 'trainer' }),
      ]);

      // Total revenue from completed payments
      const totalRevenueAgg = await PaymentModel.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

      // Monthly revenue (current calendar month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenueAgg = await PaymentModel.aggregate([
        { $match: { status: 'success', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const monthlyRevenue = monthlyRevenueAgg[0]?.total ?? 0;

      // Active roadmaps
      const activeRoadmaps = await RoadmapModel.countDocuments({ status: 'active' });

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
        },
      });
    } catch (err) {
      next(err);
    }
  }
);




export default router;

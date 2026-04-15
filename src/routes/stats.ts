import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { UserModel } from '../models/User';
import { PaymentModel } from '../models/Payment';
import { Types } from 'mongoose';
import { RoadmapModel } from '../models/Roadmap';

const router = Router();

// GET /api/stats/me — returns role-specific dashboard statistics
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role } = req.user!;
      const userObjectId = new Types.ObjectId(userId);
      const now = new Date();

      // Requirement 9.1 - Student stats
      if (role === 'student') {
        const [activeRoadmaps, roadmapProgressAgg] =
          await Promise.all([
            RoadmapModel.countDocuments({
              studentId: userId,
              status: { $in: ['active', 'approved'] },
            }),
            RoadmapModel.aggregate([
              { $match: { studentId: userId } },
              { $group: { _id: null, avg: { $avg: '$progress.overallProgress' } } },
            ]),
          ]);

        const roadmapProgress = roadmapProgressAgg[0]?.avg ?? 0;

        return res.json({
          success: true,
          data: { activeRoadmaps, roadmapProgress },
        });
      }

      // Requirement 9.2 — Trainer stats
      if (role === 'trainer') {
        const [assignedStudentsAgg] =
          await Promise.all([
            RoadmapModel.aggregate([
              { $match: { trainerId: userId } },
              { $group: { _id: '$studentId' } },
              { $count: 'count' },
            ]),
          ]);

        const assignedStudents = assignedStudentsAgg[0]?.count ?? 0;

        return res.json({
          success: true,
          data: { assignedStudents },
        });
      }

      // Requirement 9.5 - Admin stats
      if (role === 'admin') {
        const roles = ['student', 'trainer', 'admin'];

        const [userCountsByRole, totalRevenueAgg, activeRoadmaps] =
          await Promise.all([
            UserModel.aggregate([
              { $group: { _id: '$role', count: { $sum: 1 } } },
            ]),
            PaymentModel.aggregate([
              { $match: { status: 'success' } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            RoadmapModel.countDocuments({ status: { $in: ['active', 'approved'] } }),
          ]);

        const totalUsersByRole: Record<string, number> = {};
        for (const r of roles) totalUsersByRole[r] = 0;
        for (const entry of userCountsByRole) {
          totalUsersByRole[entry._id] = entry.count;
        }

        const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

        return res.json({
          success: true,
          data: { totalUsersByRole, totalRevenue, activeRoadmaps },
        });
      }

      res.status(400).json({ success: false, message: 'Unsupported role for stats' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

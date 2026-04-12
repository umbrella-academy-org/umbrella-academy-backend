import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import Roadmap from '../models/Roadmap';
import LiveSession from '../models/LiveSession';
import User from '../models/User';
import Payment from '../models/Payment';
import Wallet from '../models/Wallet';
import { Types } from 'mongoose';

const router = Router();

// GET /api/stats/me — returns role-specific dashboard statistics
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role, fieldId } = req.user!;
      const userObjectId = new Types.ObjectId(userId);
      const now = new Date();

      // Requirement 9.1 — Student stats
      if (role === 'student') {
        const [activeRoadmaps, completedSessions, upcomingSessions, roadmapProgressAgg] =
          await Promise.all([
            Roadmap.countDocuments({
              studentId: userObjectId,
              status: { $in: ['active', 'approved'] },
            }),
            LiveSession.countDocuments({
              studentId: userObjectId,
              status: 'completed',
            }),
            LiveSession.countDocuments({
              studentId: userObjectId,
              scheduledAt: { $gt: now },
            }),
            Roadmap.aggregate([
              { $match: { studentId: userObjectId } },
              { $group: { _id: null, avg: { $avg: '$progress.overallProgress' } } },
            ]),
          ]);

        const roadmapProgress = roadmapProgressAgg[0]?.avg ?? 0;

        return res.json({
          success: true,
          data: { activeRoadmaps, completedSessions, upcomingSessions, roadmapProgress },
        });
      }

      // Requirement 9.2 — Trainer stats
      if (role === 'trainer') {
        const [assignedStudentsAgg, totalSessionsConducted, upcomingSessions, wallet] =
          await Promise.all([
            Roadmap.aggregate([
              { $match: { trainerId: userObjectId } },
              { $group: { _id: '$studentId' } },
              { $count: 'count' },
            ]),
            LiveSession.countDocuments({
              trainerId: userObjectId,
              status: 'completed',
            }),
            LiveSession.countDocuments({
              trainerId: userObjectId,
              scheduledAt: { $gt: now },
            }),
            Wallet.findOne({ ownerId: userObjectId, ownerType: 'trainer' }),
          ]);

        const assignedStudents = assignedStudentsAgg[0]?.count ?? 0;
        const walletBalance = wallet?.balance ?? 0;

        return res.json({
          success: true,
          data: { assignedStudents, totalSessionsConducted, upcomingSessions, walletBalance },
        });
      }

      // Requirement 9.3 — Mentor stats
      if (role === 'mentor') {
        const [pendingApprovals, approvedRoadmaps, totalStudentsSupervisedAgg] =
          await Promise.all([
            Roadmap.countDocuments({
              mentorId: userObjectId,
              status: 'pending-approval',
            }),
            Roadmap.countDocuments({
              mentorId: userObjectId,
              status: 'approved',
            }),
            Roadmap.aggregate([
              { $match: { mentorId: userObjectId } },
              { $group: { _id: '$studentId' } },
              { $count: 'count' },
            ]),
          ]);

        const totalStudentsSupervised = totalStudentsSupervisedAgg[0]?.count ?? 0;

        return res.json({
          success: true,
          data: { pendingApprovals, approvedRoadmaps, totalStudentsSupervised },
        });
      }

      // Requirement 9.4 — Field-admin stats
      if (role === 'field-admin') {
        if (!fieldId) {
          res.status(400).json({ success: false, message: 'No fieldId associated with this user' });
          return;
        }



        const [totalStudents, totalTrainers, totalFieldRevenueAgg, activeRoadmaps] =
          await Promise.all([
            User.countDocuments({ role: 'student', fieldId: fieldId }),
            User.countDocuments({ role: 'trainer', fieldId: fieldId }),
            Payment.aggregate([
              { $match: { fieldId: fieldId, status: 'completed' } },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$revenueDistribution.fieldShare' },
                },
              },
            ]),
            Roadmap.countDocuments({
              fieldId: fieldId,
              status: { $in: ['active', 'approved'] },
            }),
          ]);

        const totalFieldRevenue = totalFieldRevenueAgg[0]?.total ?? 0;

        return res.json({
          success: true,
          data: { totalStudents, totalTrainers, totalFieldRevenue, activeRoadmaps },
        });
      }

      // Requirement 9.5 — Umbrella-admin stats
      if (role === 'umbrella-admin') {
        const roles = ['student', 'trainer', 'mentor', 'field-admin', 'umbrella-admin'];

        const [userCountsByRole, totalRevenueAgg, activeRoadmaps, completedSessions] =
          await Promise.all([
            User.aggregate([
              { $group: { _id: '$role', count: { $sum: 1 } } },
            ]),
            Payment.aggregate([
              { $match: { status: 'completed' } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
            Roadmap.countDocuments({ status: { $in: ['active', 'approved'] } }),
            LiveSession.countDocuments({ status: 'completed' }),
          ]);

        const totalUsersByRole: Record<string, number> = {};
        for (const r of roles) totalUsersByRole[r] = 0;
        for (const entry of userCountsByRole) {
          totalUsersByRole[entry._id] = entry.count;
        }

        const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

        return res.json({
          success: true,
          data: { totalUsersByRole, totalRevenue, activeRoadmaps, completedSessions },
        });
      }

      res.status(400).json({ success: false, message: 'Unsupported role for stats' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

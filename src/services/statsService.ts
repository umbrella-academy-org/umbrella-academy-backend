import { StudentModel, TrainerModel, UserModel } from '../models/User';
import { PaymentModel } from '../models/Payment';
import { RoadmapModel } from '../models/Roadmap';

export class StatsService {
  static async getStudentStats(studentId: string) {
    const [activeRoadmaps, roadmapProgressAgg] = await Promise.all([
      RoadmapModel.countDocuments({
        studentId,
        status: { $in: ['active', 'approved'] },
      }),
      RoadmapModel.aggregate([
        { $match: { studentId } },
        { $group: { _id: null, avg: { $avg: '$progress.overallProgress' } } },
      ]),
    ]);

    const roadmapProgress = roadmapProgressAgg[0]?.avg ?? 0;

    return { activeRoadmaps, roadmapProgress };
  }

  static async getTrainerStats(trainerId: string) {
    const [assignedStudentsAgg] = await Promise.all([
      RoadmapModel.aggregate([
        { $match: { trainerId } },
        { $group: { _id: '$student' } },
        { $count: 'count' },
      ]),
    ]);

    const assignedStudents = assignedStudentsAgg[0]?.count ?? 0;
    return { assignedStudents };
  }

  static async getAdminStats() {
    const roles = ['student', 'trainer', 'admin'];

    const [userCountsByRole, totalRevenueAgg, activeRoadmaps] = await Promise.all([
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

    return { totalUsersByRole, totalRevenue, activeRoadmaps };
  }

  static async getPlatformAnalytics() {
    const [studentCount, trainerCount] = await Promise.all([
      StudentModel.countDocuments({}),
      TrainerModel.countDocuments({}),
    ]);

    const totalRevenueAgg = await PaymentModel.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenueAgg = await PaymentModel.aggregate([
      { $match: { status: 'success', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthlyRevenue = monthlyRevenueAgg[0]?.total ?? 0;

    const activeRoadmaps = await RoadmapModel.countDocuments({ status: 'active' });

    return {
      usersByRole: { student: studentCount, trainer: trainerCount },
      totalRevenue,
      monthlyRevenue,
      activeRoadmaps,
    };
  }
}

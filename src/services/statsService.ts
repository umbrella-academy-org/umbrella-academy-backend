import { StudentModel, TrainerModel, UserModel } from '../models/User';
import { PaymentModel } from '../models/Payment';
import { RoadmapModel } from '../models/Roadmap';
import { BookingModel, BookingStatus } from '../models/Booking';

export class StatsService {
  static async getStudentStats(studentId: string) {
    const roadmaps = await RoadmapModel.find({ student: studentId }).lean();
    const activeRoadmaps = roadmaps.filter((roadmap) =>
      ['active', 'approved'].includes(roadmap.status)
    ).length;

    let totalMilestones = 0;
    let completedMilestones = 0;
    for (const roadmap of roadmaps) {
      for (const milestone of roadmap.milestones ?? []) {
        totalMilestones += 1;
        if (milestone.status === 'completed') {
          completedMilestones += 1;
        }
      }
    }

    const roadmapProgress =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return { activeRoadmaps, roadmapProgress, totalMilestones, completedMilestones };
  }

  static async getTrainerStats(trainerId: string) {
    const [assignedStudents, pendingBookings, upcomingSessions] = await Promise.all([
      StudentModel.countDocuments({ assignedTrainerId: trainerId }),
      BookingModel.countDocuments({ trainer: trainerId, status: BookingStatus.PENDING }),
      BookingModel.countDocuments({
        trainer: trainerId,
        status: BookingStatus.APPROVED,
        requestedTime: { $gte: new Date() },
      }),
    ]);

    return { assignedStudents, pendingBookings, upcomingSessions };
  }

  static async getAdminStats() {
    const roles = ['student', 'trainer', 'admin'];

    const [userCountsByRole, totalRevenueAgg, activeRoadmaps] = await Promise.all([
      UserModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      PaymentModel.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      RoadmapModel.countDocuments({ status: { $in: ['active', 'approved'] } }),
    ]);

    const totalUsersByRole: Record<string, number> = {};
    for (const role of roles) totalUsersByRole[role] = 0;
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

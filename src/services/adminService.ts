import { TrainerModel } from '../models/User';
import { sendEmail } from '../services/emailService';

export class AdminService {
  static async getPendingTrainers() {
    const pendingTrainers = await TrainerModel.find({
      approvalStatus: 'pending'
    }).select('-password');

    return pendingTrainers;
  }

  static async getAllTrainers(status?: string) {
    let filter: any = {};
    if (status) {
      filter.approvalStatus = status;
    }

    const trainers = await TrainerModel.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return trainers;
  }

  static async approveTrainer(trainerId: string, adminId: string) {
    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    if (trainer.approvalStatus !== 'pending') {
      throw new Error('Trainer is not in pending status');
    }

    // Update trainer status and approval details
    trainer.approvalStatus = 'approved';
    trainer.approvedBy = adminId;
    trainer.approvedAt = new Date();
    await trainer.save();

    // Send approval email
    try {
      await sendEmail({
        to_email: trainer.email,
        to_name: trainer.firstName,
        subject: 'Your Trainer Application Has Been Approved',
        message: `Congratulations! Your trainer application has been approved. You can now log in at: ${process.env.FRONTEND_URL}/auth/login`
      });
    } catch (error) {
      // Ignore email errors but log if needed
      console.warn('Failed to send approval email:', error);
    }

    return trainer;
  }

  static async rejectTrainer(trainerId: string, adminId: string, rejectionReason: string) {
    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    if (trainer.approvalStatus !== 'pending') {
      throw new Error('Trainer is not in pending status');
    }

    // Update trainer status and rejection details
    trainer.approvalStatus = 'rejected';
    trainer.approvedBy = adminId;
    trainer.approvedAt = new Date();
    trainer.rejectionReason = rejectionReason;
    await trainer.save();

    // Send rejection email
    try {
      await sendEmail({
        to_email: trainer.email,
        to_name: trainer.firstName,
        subject: 'Your Trainer Application Has Been Rejected',
        message: `We regret to inform you that your trainer application has not been approved at this time. Reason: ${rejectionReason}`
      });
    } catch (error) {
      // Ignore email errors but log if needed
      console.warn('Failed to send rejection email:', error);
    }

    return trainer;
  }

  static async deleteTrainer(trainerId: string) {
    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    await TrainerModel.findByIdAndDelete(trainerId);
    return null;
  }

  static async getPlatformAnalytics() {
    // This method can be expanded with more analytics
    const totalTrainers = await TrainerModel.countDocuments();
    const pendingTrainers = await TrainerModel.countDocuments({ approvalStatus: 'pending' });
    const approvedTrainers = await TrainerModel.countDocuments({ approvalStatus: 'approved' });
    const rejectedTrainers = await TrainerModel.countDocuments({ approvalStatus: 'rejected' });

    return {
      trainers: {
        total: totalTrainers,
        pending: pendingTrainers,
        approved: approvedTrainers,
        rejected: rejectedTrainers
      }
    };
  }
}

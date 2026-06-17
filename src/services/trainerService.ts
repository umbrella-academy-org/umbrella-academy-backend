import { TrainerModel } from '../models/User';

export class TrainerService {
  static async getPendingTrainers() {
    return TrainerModel.find({ approvalStatus: 'pending' }).select('-password');
  }

  static async getAllTrainers() {
    return TrainerModel.find({}).select('-password');
  }

  static async getTrainerById(trainerId: string) {
    return TrainerModel.findById(trainerId).select('-password');
  }

  static async getApprovedTrainers() {
    return TrainerModel.find({
      approvalStatus: 'approved',
      isActive: true,
    }).select('-password');
  }
}

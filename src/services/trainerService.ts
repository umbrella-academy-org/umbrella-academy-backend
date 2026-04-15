import { UserModel } from '../models/User';

export class TrainerService {
  static async getPendingTrainers() {
    const filter: Record<string, unknown> = {
      role: 'trainer',
      approvalStatus: 'pending',
    };

    const users = await UserModel.find(filter).select('-password');
    return users;
  }

  static async getAllTrainers() {
    const trainers = await UserModel.find({ role: 'trainer' }).select('-password');
    return trainers;
  }

  static async getTrainerById(trainerId: string) {
    const trainer = await UserModel.findOne({ _id: trainerId, role: 'trainer' }).select('-password');
    return trainer;
  }

  static async getApprovedTrainers() {
    const trainers = await UserModel.find({ 
      role: 'trainer', 
      approvalStatus: 'approved',
      status: 'active'
    }).select('-password');
    return trainers;
  }
}

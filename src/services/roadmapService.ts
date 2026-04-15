import { RoadmapModel } from '../models/Roadmap';

export class RoadmapService {
  static async findRoadmapsByRole(userId: string, role: string) {
    let filter: Record<string, unknown> = {};

    if (role === 'student') {
      filter = { studentId: userId };
    } else if (role === 'trainer') {
      filter = { trainerId: userId };
    }
    // admin: no filter - return all

    return await RoadmapModel.find(filter);
  }

  static async createRoadmap(roadmapData: any, trainerId: string) {
    const data = {
      ...roadmapData,
      trainerId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await RoadmapModel.create(data);
  }

  static async findRoadmapById(id: string) {
    return await RoadmapModel.findById(id);
  }

  static async updateRoadmap(id: string, updateData: any) {
    return await RoadmapModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  static async checkRoadmapAccess(roadmap: any, userId: string, role: string) {
    if (role === 'student' && roadmap.studentId !== userId) {
      return false;
    }
    if (role === 'trainer' && roadmap.trainerId !== userId) {
      return false;
    }
    return true;
  }
}

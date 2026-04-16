import { RoadmapModel } from '../models/Roadmap';
import { StudentModel } from '../models/User';

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
    // Validate student exists
    const student = await StudentModel.findById(roadmapData.studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Assign the creating trainer to the student if not already assigned
    if (!student.assignedTrainerId) {
      await StudentModel.findByIdAndUpdate(roadmapData.studentId, {
        assignedTrainerId: trainerId
      });
    } else if (student.assignedTrainerId.toString() !== trainerId) {
      throw new Error('Only the assigned trainer can create roadmap for this student');
    }

    // Generate unique IDs for roadmap and milestones
    const roadmapId = `RM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Process milestones with proper IDs and status
    const processedMilestones = roadmapData.milestones.map((milestone: any, index: number) => ({
      ...milestone,
     
      order: index + 1,
      status: milestone.status || 'locked', // Default to locked for new milestones
      completedAt: null
    }));

    const data = {
      id: roadmapId,
      studentId: roadmapData.studentId,
      trainerId,
      title: roadmapData.title,
      status: roadmapData.status || 'draft', // Default to draft
      milestones: processedMilestones,
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

  static async approveRoadmap(roadmapId: string, adminId: string) {
    const roadmap = await RoadmapModel.findOne({ id: roadmapId });
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'pending-approval') {
      throw new Error('Roadmap must be in pending-approval status to be approved');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { id: roadmapId },
      {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Update student onboarding status
    await StudentModel.findByIdAndUpdate(roadmap.studentId, {
      'onboardingStatus.roadmapReceived': true
    });

    return updatedRoadmap;
  }

  static async rejectRoadmap(roadmapId: string, adminId: string, rejectionReason: string) {
    const roadmap = await RoadmapModel.findOne({ id: roadmapId });
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'pending-approval') {
      throw new Error('Roadmap must be in pending-approval status to be rejected');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { id: roadmapId },
      {
        status: 'rejected',
        approvedBy: adminId,
        rejectionReason,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return updatedRoadmap;
  }

  static async submitForApproval(roadmapId: string, trainerId: string) {
    const roadmap = await RoadmapModel.findOne({ id: roadmapId, trainerId });
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'draft') {
      throw new Error('Only draft roadmaps can be submitted for approval');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { id: roadmapId },
      {
        status: 'pending-approval',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return updatedRoadmap;
  }

  static async activateRoadmap(roadmapId: string, adminId: string) {
    const roadmap = await RoadmapModel.findOne({ id: roadmapId });
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'approved') {
      throw new Error('Roadmap must be approved before activation');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { id: roadmapId },
      {
        status: 'active',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Update student onboarding status
    await StudentModel.findByIdAndUpdate(roadmap.studentId, {
      'onboardingStatus.learningStarted': true
    });

    return updatedRoadmap;
  }
}

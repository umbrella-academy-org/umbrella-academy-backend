import { response } from 'express';
import { RoadmapModel } from '../models/Roadmap';
import { StudentModel } from '../models/User';

export class RoadmapService {
  static async findRoadmapsByRole(userId: string, role: string) {
    let filter: Record<string, unknown> = {};

    if (role === 'student') {
      filter = { student: userId };
    } else if (role === 'trainer') {
      filter = { trainer: userId };
    }
    // admin: no filter - return all

    return await RoadmapModel.find(filter)
    .populate('studentId', 'firstName lastName email')
    .populate('trainerId', 'firstName lastName email');
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
      student: roadmapData.studentId,
      trainer:trainerId,
      title: roadmapData.title,
      status: roadmapData.status ,
      milestones: processedMilestones,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await RoadmapModel.create(data);
  }

  static async findRoadmapById(id: string) {
    return await RoadmapModel.findById(id)
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
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'pending-approval') {
      throw new Error('Roadmap must be in pending-approval status to be approved');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { _id: roadmapId },
      {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Update student onboarding status
    await StudentModel.findByIdAndUpdate(roadmap.student, {
      'onboardingStatus.roadmapReceived': true,
      'onboardingStatus.learningStarted': true
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
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.status !== 'approved') {
      throw new Error('Roadmap must be approved before activation');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      { _id: roadmapId },
      {
        status: 'active',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Update student onboarding status
    await StudentModel.findByIdAndUpdate(roadmap.student, {
      'onboardingStatus.learningStarted': true
    });

    return updatedRoadmap;
  }

  static async completeMilestone(roadmapId: string, milestoneId: number, studentId: string, projectData: any) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.student !== studentId) {
      throw new Error('Access denied: This roadmap does not belong to the student');
    }

    // Find the milestone in the roadmap
    const milestone = roadmap.milestones.find(m => m.order == milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

  

    if (milestone.status !== 'active' && milestone.status !== 'locked') {
      throw new Error('Milestone must be active or locked to be completed');
    }

    // Create a project from the submission data (use student's input or fallback to defaults)
    const { ProjectService } = await import('./projectService');
    const project = await ProjectService.createProject({
      roadmapId,
      milestoneId,
      title: projectData.title || `${milestone.title} - Project Submission`,
      description: projectData.description || `Project submission for milestone: ${milestone.title}`,
      category: projectData.category || 'Milestone Project',
      studentRole: projectData.studentRole || 'Student',
      toolsUsed: projectData.toolsUsed || [],
      evidence: projectData.evidence || {},
      attachments: projectData.attachments || { images: [], pdfs: [] }
    }, studentId);

    // Submit the project for approval
    await ProjectService.submitProject(project.id, studentId);

    // Update milestone status to pending-approval
    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmapId,
        'milestones.order': milestoneId
      },
      {
        $set: {
          'milestones.$.status': 'pending-approval',
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    return { roadmap: updatedRoadmap, project };
  }

  static async approveMilestone(roadmapId: string, milestoneId: number, trainerId: string, feedback: string) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    // Find the milestone in the roadmap
    const milestone = roadmap.milestones.find(m => m.order == milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

      if (milestone.status === 'completed') {
      return roadmap
    }

    if (milestone.status !== 'pending-approval') {
      throw new Error('Milestone must be in pending-approval status to be approved');
    }

    // Update milestone status to completed
    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmapId,
        'milestones.order': milestoneId
      },
      {
        $set: {
          'milestones.$.status': 'completed',
          'milestones.$.completedAt': new Date(),
          'milestones.$.trainerFeedback': feedback || null,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    // Check if all milestones are completed and update roadmap status
    const allMilestonesCompleted = updatedRoadmap?.milestones.every(m => m.status === 'completed');
    if (allMilestonesCompleted) {
      await RoadmapModel.findByIdAndUpdate(roadmapId, {
        status: 'completed',
        updatedAt: new Date()
      });

      // Update student onboarding status
      await StudentModel.findByIdAndUpdate(roadmap.student, {
        'onboardingStatus.learningCompleted': true
      });
    }

    return updatedRoadmap;
  }

  static async activateNextMilestone(roadmapId: string, studentId: string) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.student !== studentId) {
      throw new Error('Access denied: This roadmap does not belong to the student');
    }

    // Find the next locked milestone
    const nextMilestone = roadmap.milestones.find(m => m.status === 'locked');
    if (!nextMilestone) {
      throw new Error('No locked milestones found to activate');
    }

    // Update the next milestone to active
    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmapId,
        'milestones.order': nextMilestone.order
      },
      {
        $set: {
          'milestones.$.status': 'active',
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    return updatedRoadmap;
  }
}

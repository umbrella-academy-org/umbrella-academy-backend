import { Types } from 'mongoose';
import { RoadmapModel } from '../models/Roadmap';
import { StudentModel } from '../models/User';

function normalizeId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  return String(value);
}

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
    .populate('student', 'firstName lastName email')
    .populate('trainer', 'firstName lastName email');
  }

  static async createRoadmap(roadmapData: any, trainerId: string) {
    const studentId = roadmapData.studentId || roadmapData.student;
    if (!studentId) {
      throw new Error('Student is required');
    }

    // Validate student exists
    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Assign the creating trainer to the student if not already assigned
    if (!student.assignedTrainerId) {
      await StudentModel.findByIdAndUpdate(studentId, {
        assignedTrainerId: trainerId,
      });
    } else if (student.assignedTrainerId.toString() !== trainerId) {
      throw new Error('Only the assigned trainer can create roadmap for this student');
    }

    // Process milestones with proper order and initial lock state
    const processedMilestones = roadmapData.milestones.map((milestone: any, index: number) => ({
      ...milestone,
      order: index + 1,
      status: milestone.status || 'locked',
      completedAt: null,
    }));

    const data = {
      student: studentId,
      trainer: trainerId,
      title: roadmapData.title,
      status: roadmapData.status || 'pending-approval',
      milestones: processedMilestones,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const roadmap = await RoadmapModel.create(data);
    await StudentModel.findByIdAndUpdate(studentId, {
      currentRoadmapId: roadmap._id.toString(),
    });
    return roadmap;
  }

  static async findRoadmapById(id: string) {
    if (Types.ObjectId.isValid(id)) {
      const roadmap = await RoadmapModel.findById(id);
      if (roadmap) return roadmap;
    }
    return RoadmapModel.findOne({ _id: id });
  }

  private static async activateFirstLockedMilestone(roadmapId: string) {
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) return null;

    const nextMilestone = roadmap.milestones.find((m) => m.status === 'locked');
    if (!nextMilestone) return roadmap;

    return RoadmapModel.findOneAndUpdate(
      { _id: roadmap._id, 'milestones.order': nextMilestone.order },
      {
        $set: {
          'milestones.$.status': 'active',
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
  }

  static async updateRoadmap(id: string, updateData: any) {
    return await RoadmapModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }

  static async checkRoadmapAccess(roadmap: any, userId: string, role: string) {
    if (role === 'student' && normalizeId(roadmap.student) !== normalizeId(userId)) {
      return false;
    }
    if (role === 'trainer' && normalizeId(roadmap.trainer) !== normalizeId(userId)) {
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
      { _id: roadmap._id },
      {
        status: 'active',
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    await this.activateFirstLockedMilestone(roadmap._id.toString());

    // Update student onboarding status
    await StudentModel.findByIdAndUpdate(roadmap.student, {
      'onboardingStatus.learningStarted': true
    });

    return updatedRoadmap;
  }

  static async completeMilestone(roadmapId: string, milestoneId: number, studentId: string, projectData: any) {
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (normalizeId(roadmap.student) !== normalizeId(studentId)) {
      throw new Error('Access denied: This roadmap does not belong to the student');
    }

    // Find the milestone in the roadmap
    const milestone = roadmap.milestones.find(m => m.order == milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

  

    if (milestone.status !== 'active') {
      throw new Error('Milestone must be active to submit a project for approval');
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
    const projectId = project._id.toString();
    await ProjectService.submitProject(projectId, studentId);

    // Update milestone status to pending-approval
    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmap._id,
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
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (normalizeId(roadmap.trainer) !== normalizeId(trainerId)) {
      throw new Error('Access denied: Only the assigned trainer can approve milestones');
    }

    const milestone = roadmap.milestones.find(m => m.order == milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

    if (milestone.status === 'completed') {
      return roadmap;
    }

    if (milestone.status !== 'pending-approval') {
      throw new Error('Milestone must be in pending-approval status to be approved');
    }

    const submittedProjectIds = milestone.submittedProjectIds ?? [];
    if (submittedProjectIds.length === 0) {
      throw new Error('No submitted projects found for this milestone');
    }

    const { ProjectModel, ProjectStatus } = await import('../models/Project');
    const submittedProjects = await ProjectModel.find({ _id: { $in: submittedProjectIds } });
    if (
      submittedProjects.length !== submittedProjectIds.length ||
      !submittedProjects.every((project) => project.status === ProjectStatus.APPROVED)
    ) {
      throw new Error('All submitted projects must be approved before completing this milestone');
    }

    // Update milestone status to completed
    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmap._id,
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

    await this.activateFirstLockedMilestone(roadmap._id.toString());

    // Check if all milestones are completed and update roadmap status
    const allMilestonesCompleted = updatedRoadmap?.milestones.every(m => m.status === 'completed');
    if (allMilestonesCompleted) {
      await RoadmapModel.findByIdAndUpdate(roadmapId, {
        status: 'completed',
        updatedAt: new Date()
      });
    }

    try {
      const { CertificateService } = await import('./certificateService');
      await CertificateService.issueForMilestone({
        roadmapId,
        milestoneOrder: milestoneId,
        studentId: roadmap.student,
        trainerId,
      });
    } catch (error) {
      console.warn('Failed to issue certificate:', error);
    }

    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.create({
        userId: roadmap.student,
        title: 'Milestone completed',
        message: feedback
          ? `Your trainer approved "${milestone.title}": ${feedback}`
          : `Your trainer approved "${milestone.title}".`,
        category: 'roadmap',
        actionUrl: '/dashboard/student/roadmap',
        relatedEntityId: roadmapId,
      });
    } catch (error) {
      console.warn('Failed to create milestone approval notification:', error);
    }

    return updatedRoadmap;
  }

  static async rejectMilestone(
    roadmapId: string,
    milestoneId: number,
    trainerId: string,
    feedback: string
  ) {
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (normalizeId(roadmap.trainer) !== normalizeId(trainerId)) {
      throw new Error('Access denied: Only the assigned trainer can reject milestones');
    }

    const milestone = roadmap.milestones.find((m) => m.order == milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

    if (milestone.status !== 'pending-approval') {
      throw new Error('Milestone must be in pending-approval status to be rejected');
    }

    const updatedRoadmap = await RoadmapModel.findOneAndUpdate(
      {
        _id: roadmap._id,
        'milestones.order': milestoneId,
      },
      {
        $set: {
          'milestones.$.status': 'active',
          'milestones.$.trainerFeedback': feedback || null,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    try {
      const { ProjectModel, ProjectStatus } = await import('../models/Project');
      await ProjectModel.findOneAndUpdate(
        {
          roadmap: roadmapId,
          milestoneId,
          status: ProjectStatus.PENDING_APPROVAL,
        },
        {
          status: ProjectStatus.REJECTED,
          trainerFeedback: feedback,
        }
      );
    } catch (error) {
      console.warn('Failed to reject linked project:', error);
    }

    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.create({
        userId: roadmap.student,
        title: 'Milestone needs revision',
        message: feedback
          ? `Your trainer requested changes on "${milestone.title}": ${feedback}`
          : `Your trainer requested changes on "${milestone.title}".`,
        category: 'roadmap',
        actionUrl: '/dashboard/student/roadmap',
        relatedEntityId: roadmapId,
      });
    } catch (error) {
      console.warn('Failed to create milestone rejection notification:', error);
    }

    return updatedRoadmap;
  }

  static async deleteRoadmap(roadmapId: string, trainerId: string) {
    const roadmap = await RoadmapModel.findById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (roadmap.trainer !== trainerId) {
      throw new Error('Access denied: Only the assigned trainer can delete this roadmap');
    }

    if (!['draft', 'rejected'].includes(roadmap.status)) {
      throw new Error('Only draft or rejected roadmaps can be deleted');
    }

    await RoadmapModel.findByIdAndDelete(roadmapId);
    return { deleted: true };
  }

  static async setMilestoneLockState(
    roadmapId: string,
    milestoneOrder: number,
    trainerId: string,
    locked: boolean
  ) {
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (normalizeId(roadmap.trainer) !== normalizeId(trainerId)) {
      throw new Error('Access denied: Only the assigned trainer can update milestones');
    }

    if (!['active'].includes(roadmap.status)) {
      throw new Error('Roadmap must be active before milestone availability can change');
    }

    const milestone = roadmap.milestones.find((m) => m.order === milestoneOrder);
    if (!milestone) {
      throw new Error('Milestone not found in this roadmap');
    }

    const nextStatus = locked ? 'locked' : 'active';
    if (milestone.status === nextStatus) {
      return roadmap;
    }

    if (locked && milestone.status !== 'active') {
      throw new Error('Only active milestones can be locked');
    }

    if (!locked && milestone.status !== 'locked') {
      throw new Error('Only locked milestones can be unlocked');
    }

    if (!locked) {
      const hasOtherActive = roadmap.milestones.some(
        (m) => m.order !== milestoneOrder && m.status === 'active'
      );
      if (hasOtherActive) {
        throw new Error('Another milestone is already active. Complete it before unlocking the next one.');
      }
    }

    return RoadmapModel.findOneAndUpdate(
      { _id: roadmap._id, 'milestones.order': milestoneOrder },
      {
        $set: {
          'milestones.$.status': nextStatus,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
  }

  static async activateNextMilestone(roadmapId: string, studentId: string) {
    const roadmap = await this.findRoadmapById(roadmapId);
    if (!roadmap) {
      throw new Error('Roadmap not found');
    }

    if (normalizeId(roadmap.student) !== normalizeId(studentId)) {
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
        _id: roadmap._id,
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

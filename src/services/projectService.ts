import { ProjectModel, ProjectStatus } from '../models/Project';
import { StudentModel } from '../models/User';
import { RoadmapModel } from '../models/Roadmap';

export class ProjectService {
  static async createProject(projectData: any, studentId: string) {
    // Validate student exists
    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Validate milestone linking if provided
    if (projectData.milestoneId && projectData.roadmapId) {
      const roadmap = await RoadmapModel.findById(projectData.roadmapId);
      if (!roadmap) {
        throw new Error('Roadmap not found');
      }

      if (roadmap.student !== studentId) {
        throw new Error('Access denied: This roadmap does not belong to the student');
      }

      // Check if milestone exists in the roadmap
      const milestone = roadmap.milestones.find(m => m.order == projectData.milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found in this roadmap');
      }
    }

    const project = new ProjectModel({
      title: projectData.title,
      description: projectData.description,
      category: projectData.category,
      studentRole: projectData.studentRole,
      toolsUsed: projectData.toolsUsed ?? [],
      evidence: projectData.evidence ?? {},
      attachments: projectData.attachments ?? { images: [], pdfs: [] },
      student: studentId,
      roadmap: projectData.roadmapId ?? projectData.roadmap ?? undefined,
      milestoneId: projectData.milestoneId ?? undefined,
      status: ProjectStatus.DRAFT,
    });

    return await project.save();
  }

  static async getStudentProjects(student: string, status?: ProjectStatus) {
    let filter: any = { student };
    if (status) {
      filter.status = status;
    }

    const projects = await ProjectModel.find(filter)
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    return projects;
  }

  static async getProjectById(projectId: string, userId?: string, userRole?: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check access permissions
    if (userId && userRole) {
      if (userRole === 'student' && project.student !== userId) {
        throw new Error('Access denied: This project does not belong to you');
      }
      // Trainers can view projects of their assigned students
      if (userRole === 'trainer') {
        const student = await StudentModel.findById(project.student);

        if (student?.assignedTrainerId != userId) {
          throw new Error('Access denied: You are not assigned to this student');
        }
      }
    }

    return project;
  }

  static async updateProject(projectId: string, updateData: any, studentId: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.student !== studentId) {
      throw new Error('Access denied: This project does not belong to you');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new Error('Only draft projects can be updated');
    }

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      projectId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    return updatedProject;
  }

  static async submitProject(projectId: string, studentId: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.student !== studentId) {
      throw new Error('Access denied: This project does not belong to you');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new Error('Only draft projects can be submitted');
    }

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      projectId,
      {
        status: ProjectStatus.PENDING_APPROVAL,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Add project to milestone's submitted projects if linked
    if (project.roadmap && project.milestoneId) {
      try {
        const roadmap = await RoadmapModel.findById(project.roadmap);
        if (roadmap) {
          const milestone = roadmap.milestones.find(m => m.order == parseInt(project.milestoneId!.toString()));
          if (milestone) {
            milestone.submittedProjectIds = milestone.submittedProjectIds || [];
            if (!milestone.submittedProjectIds.includes(projectId)) {
              milestone.submittedProjectIds.push(projectId);
              await roadmap.save();
            }
          }
        }
      } catch (error) {
        console.warn('Failed to add project to milestone tracking:', error);
      }
    }

    return updatedProject;
  }

  static async approveProject(projectId: string, trainerId: string, feedback: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.PENDING_APPROVAL) {
      throw new Error('Project must be in pending approval status to be approved');
    }

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      projectId,
      {
        status: ProjectStatus.APPROVED,
        approvedByTrainerId: trainerId,
        trainerFeedback: feedback || null,
        approvedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // Add project to milestone's completed projects and complete the milestone if linked
    if (project.roadmap && project.milestoneId) {
      try {
        // Add project to milestone's completed projects
        const roadmap = await RoadmapModel.findById(project.roadmap);
        if (roadmap) {
          const milestone = roadmap.milestones.find(m => m.order == parseInt(project.milestoneId!.toString()));
          if (milestone) {
            milestone.completedProjectIds = milestone.completedProjectIds || [];
            if (!milestone.completedProjectIds.includes(projectId)) {
              milestone.completedProjectIds.push(projectId);
              await roadmap.save();
            }
          }
        }

        // Import RoadmapService to avoid circular dependency
        const { RoadmapService } = await import('./roadmapService');
        await RoadmapService.approveMilestone(
          project.roadmap,
          project.milestoneId,
          trainerId,
          feedback
        );
      } catch (error) {
        // Log error but don't fail the project approval
        console.warn('Failed to complete linked milestone:', error);
      }
    }

    return updatedProject;
  }

  static async rejectProject(projectId: string, trainerId: string, feedback: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.PENDING_APPROVAL) {
      throw new Error('Project must be in pending approval status to be rejected');
    }

    const updatedProject = await ProjectModel.findByIdAndUpdate(
      projectId,
      {
        status: ProjectStatus.REJECTED,
        approvedByTrainerId: trainerId,
        trainerFeedback: feedback,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return updatedProject;
  }

  static async getTrainerProjects(trainerId: string, status?: ProjectStatus) {
    // Get all students assigned to this trainer
    const students = await StudentModel.find({ assignedTrainerId: trainerId });
    const studentIds = students.map(student => student._id.toString());

    let filter: any = { student: { $in: studentIds } };
    if (status) {
      filter.status = status;
    }

    const projects = await ProjectModel.find(filter)
      .sort({ createdAt: -1 });

    return projects;
  }

  static async getAllProjects(status?: ProjectStatus) {
    let filter: any = {};
    if (status) {
      filter.status = status;
    }

    const projects = await ProjectModel.find(filter)
      .sort({ createdAt: -1 });

    return projects;
  }

  static async deleteProject(projectId: string, studentId: string) {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.student !== studentId) {
      throw new Error('Access denied: This project does not belong to you');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new Error('Only draft projects can be deleted');
    }

    await ProjectModel.findByIdAndDelete(projectId);
    return null;
  }
}

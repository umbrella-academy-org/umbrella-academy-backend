import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/projectService';
import { ProjectStatus } from '../models/Project';

export class ProjectController {
  // POST /api/projects - create new project (students only)
  static async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectData = req.body;

      const project = await ProjectService.createProject(projectData, userId);
      res.status(201).json({ 
        success: true, 
        data: project,
        message: 'Project created successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Student not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /api/projects - get user's projects (students) or assigned student projects (trainers)
  static async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const { status } = req.query as { status?: ProjectStatus };

      let projects;
      if (role === 'student') {
        projects = await ProjectService.getStudentProjects(userId, status);
      } else if (role === 'trainer') {
        projects = await ProjectService.getTrainerProjects(userId, status);
      } else if (role === 'admin') {
        projects = await ProjectService.getAllProjects(status);
      }

      res.json({ 
        success: true, 
        data: projects 
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/projects/:id - get specific project
  static async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const projectId = req.params.id as string;

      const project = await ProjectService.getProjectById(projectId, userId, role);
      res.json({ 
        success: true, 
        data: project 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message.includes('Access denied')) {
          return res.status(403).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // PUT /api/projects/:id - update project (students only)
  static async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectId = req.params.id as string;
      const updateData = req.body;

      const project = await ProjectService.updateProject(projectId, updateData, userId);
      res.json({ 
        success: true, 
        data: project,
        message: 'Project updated successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied: This project does not belong to you') {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message === 'Only draft projects can be updated') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/projects/:id/submit - submit project for approval (students only)
  static async submitProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectId = req.params.id as string;

      const project = await ProjectService.submitProject(projectId, userId);
      res.json({ 
        success: true, 
        data: project,
        message: 'Project submitted for approval successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied: This project does not belong to you') {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message === 'Only draft projects can be submitted') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/projects/:id/approve - approve project (trainers only)
  static async approveProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectId = req.params.id as string;
      const { feedback } = req.body as { feedback?: string };

      const project = await ProjectService.approveProject(projectId, userId, feedback);
      res.json({ 
        success: true, 
        data: project,
        message: 'Project approved successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Project must be in pending approval status to be approved') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/projects/:id/reject - reject project (trainers only)
  static async rejectProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectId = req.params.id as string;
      const { feedback } = req.body as { feedback: string };

      if (!feedback) {
        return res.status(400).json({ 
          success: false, 
          message: 'Rejection feedback is required' 
        });
      }

      const project = await ProjectService.rejectProject(projectId, userId, feedback);
      res.json({ 
        success: true, 
        data: project,
        message: 'Project rejected successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Project must be in pending approval status to be rejected') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // DELETE /api/projects/:id - delete project (students only)
  static async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const projectId = req.params.id as string;

      await ProjectService.deleteProject(projectId, userId);
      res.json({ 
        success: true, 
        message: 'Project deleted successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Project not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied: This project does not belong to you') {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message === 'Only draft projects can be deleted') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { RoadmapService } from '../services/roadmapService';




export class RoadmapController {
  // GET /api/roadmaps - role-scoped roadmaps
  static async getRoadmaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const roadmaps = await RoadmapService.findRoadmapsByRole(userId, role);
      res.json({ success: true, data: roadmaps });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/roadmaps - create new roadmap (trainers only)
  static async createRoadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmap = await RoadmapService.createRoadmap(req.body, userId);
      res.status(201).json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/roadmaps/:id - get specific roadmap
  static async getRoadmapById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const roadmap = await RoadmapService.findRoadmapById(req.params.id as string);

      if (!roadmap) {
        return res.status(404).json({ success: false, message: 'Roadmap not found' });
      }

      const hasAccess = RoadmapService.checkRoadmapAccess(roadmap, userId, role);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/roadmaps/:id - update roadmap (trainers only)
  static async updateRoadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmap = await RoadmapService.findRoadmapById(req.params.id as string);

      if (!roadmap) {
        return res.status(404).json({ success: false, message: 'Roadmap not found' });
      }

      if (roadmap.trainerId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const updatedRoadmap = await RoadmapService.updateRoadmap(req.params.id as string, req.body);
      res.json({ success: true, data: updatedRoadmap });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/roadmaps/:id/submit-for-approval - submit roadmap for approval (trainers only)
  static async submitForApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmapId = req.params.id as string;

      const roadmap = await RoadmapService.submitForApproval(roadmapId, userId);
      res.json({ 
        success: true, 
        data: roadmap,
        message: 'Roadmap submitted for approval successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Roadmap not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Only draft roadmaps can be submitted for approval') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/roadmaps/:id/approve - approve roadmap (admin only)
  static async approveRoadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmapId = req.params.id as string;

      console.log(req.params.id)

      const roadmap = await RoadmapService.approveRoadmap(roadmapId, userId);
      res.json({ 
        success: true, 
        data: roadmap,
        message: 'Roadmap approved successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Roadmap not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Roadmap must be in pending-approval status to be approved') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/roadmaps/:id/reject - reject roadmap (admin only)
  static async rejectRoadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmapId = req.params.id as string;
      const { rejectionReason } = req.body as { rejectionReason: string };

      if (!rejectionReason) {
        return res.status(400).json({ 
          success: false, 
          message: 'Rejection reason is required' 
        });
      }

      const roadmap = await RoadmapService.rejectRoadmap(roadmapId, userId, rejectionReason);
      res.json({ 
        success: true, 
        data: roadmap,
        message: 'Roadmap rejected successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Roadmap not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Roadmap must be in pending-approval status to be rejected') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/roadmaps/:id/activate - activate roadmap (admin only)
  static async activateRoadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const roadmapId = req.params.id as string;

      const roadmap = await RoadmapService.activateRoadmap(roadmapId, userId);
      res.json({ 
        success: true, 
        data: roadmap,
        message: 'Roadmap activated successfully' 
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Roadmap not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Roadmap must be approved before activation') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }
}

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
}

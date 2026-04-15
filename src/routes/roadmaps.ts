import { Router, Request, Response, NextFunction } from 'express';
import { RoadmapModel } from '../models/Roadmap';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/roadmaps - role-scoped roadmaps
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    let filter: Record<string, unknown> = {};

    if (role === 'student') {
      filter = { studentId: userId };
    } else if (role === 'trainer') {
      filter = { trainerId: userId };
    }
    // admin: no filter - return all

    const roadmaps = await RoadmapModel.find(filter);
    res.json({ success: true, data: roadmaps });
  } catch (err) {
    next(err);
  }
});

// POST /api/roadmaps - create new roadmap (trainers only)
router.post('/', authenticate, requireRole('trainer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const roadmapData = {
      ...req.body,
      trainerId: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const roadmap = await RoadmapModel.create(roadmapData);
    res.status(201).json({ success: true, data: roadmap });
  } catch (err) {
    next(err);
  }
});

// GET /api/roadmaps/:id - get specific roadmap
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const roadmap = await RoadmapModel.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found' });
    }

    // Check access permissions
    if (role === 'student' && roadmap.studentId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (role === 'trainer' && roadmap.trainerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: roadmap });
  } catch (err) {
    next(err);
  }
});

// PUT /api/roadmaps/:id - update roadmap (trainers only)
router.put('/:id', authenticate, requireRole('trainer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const roadmap = await RoadmapModel.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found' });
    }

    if (roadmap.trainerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRoadmap = await RoadmapModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updatedRoadmap });
  } catch (err) {
    next(err);
  }
});

export default router;

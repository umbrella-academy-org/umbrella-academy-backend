import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { RoadmapController } from '../controllers/roadmapController';

const router = Router();

// GET /api/roadmaps - role-scoped roadmaps
router.get('/', authenticate, RoadmapController.getRoadmaps);

// POST /api/roadmaps - create new roadmap (trainers only)
router.post('/', authenticate, requireRole('trainer'), RoadmapController.createRoadmap);

// GET /api/roadmaps/:id - get specific roadmap
router.get('/:id', authenticate, RoadmapController.getRoadmapById);

// PUT /api/roadmaps/:id - update roadmap (trainers only)
router.put('/:id', authenticate, requireRole('trainer'), RoadmapController.updateRoadmap);

export default router;

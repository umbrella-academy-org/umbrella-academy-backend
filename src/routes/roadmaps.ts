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

// POST /api/roadmaps/:id/submit-for-approval - submit roadmap for approval (trainers only)
router.post('/:id/submit-for-approval', authenticate, requireRole('trainer'), RoadmapController.submitForApproval);

// POST /api/roadmaps/:id/approve - approve roadmap (admin only)
router.post('/:id/approve', authenticate, requireRole('admin'), RoadmapController.approveRoadmap);

// POST /api/roadmaps/:id/reject - reject roadmap (admin only)
router.post('/:id/reject', authenticate, requireRole('admin'), RoadmapController.rejectRoadmap);

// POST /api/roadmaps/:id/activate - activate roadmap (admin only)
router.post('/:id/activate', authenticate, requireRole('admin'), RoadmapController.activateRoadmap);

// POST /api/roadmaps/:roadmapId/milestones/:milestoneId/complete - complete milestone (students only)
router.post('/:roadmapId/milestones/:milestoneId/complete', authenticate, requireRole('student'), RoadmapController.completeMilestone);

// POST /api/roadmaps/:roadmapId/milestones/:milestoneId/approve - approve milestone (trainers only)
router.post('/:roadmapId/milestones/:milestoneId/approve', authenticate, requireRole('trainer'), RoadmapController.approveMilestone);

// POST /api/roadmaps/:roadmapId/activate-next-milestone - activate next milestone (students only)
router.post('/:roadmapId/activate-next-milestone', authenticate, requireRole('student'), RoadmapController.activateNextMilestone);

export default router;

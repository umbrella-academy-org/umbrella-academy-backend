import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { ProjectController } from '../controllers/projectController';

const router = Router();

// POST /api/projects - create new project (students only)
router.post('/', authenticate, requireRole('student'), ProjectController.createProject);

// GET /api/projects - get user's projects (students) or assigned student projects (trainers)
router.get('/', authenticate, ProjectController.getProjects);

// GET /api/projects/:id - get specific project
router.get('/:id', authenticate, ProjectController.getProjectById);

// PUT /api/projects/:id - update project (students only)
router.put('/:id', authenticate, requireRole('student'), ProjectController.updateProject);

// POST /api/projects/:id/submit - submit project for approval (students only)
router.post('/:id/submit', authenticate, requireRole('student'), ProjectController.submitProject);

// POST /api/projects/:id/approve - approve project (trainers only)
router.post('/:id/approve', authenticate, requireRole('trainer'), ProjectController.approveProject);

// POST /api/projects/:id/reject - reject project (trainers only)
router.post('/:id/reject', authenticate, requireRole('trainer'), ProjectController.rejectProject);

// DELETE /api/projects/:id - delete project (students only)
router.delete('/:id', authenticate, requireRole('student'), ProjectController.deleteProject);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { TrainerController } from '../controllers/trainerController';

const router = Router();

// GET /trainers/pending - list pending trainers (Requirements 10.6)
router.get('/pending', authenticate, requireRole('admin'), TrainerController.getPendingTrainers);

// GET /trainers - get all trainers
router.get('/', authenticate, TrainerController.getAllTrainers);

// GET /trainers/approved - get approved trainers
router.get('/approved', TrainerController.getApprovedTrainers);

// GET /trainers/:id - get trainer by id
router.get('/:id', authenticate, TrainerController.getTrainerById);

export default router;

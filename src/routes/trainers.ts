import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { TrainerController } from '../controllers/trainerController';
import { AvailabilityController } from '../controllers/availabilityController';

const router = Router();

// GET /trainers/me - get current logged in trainer
router.get('/me', authenticate, requireRole('trainer'), TrainerController.getSessionTrainer);

router.get(
  '/me/availability',
  authenticate,
  requireRole('trainer'),
  AvailabilityController.getMyAvailability
);

router.put(
  '/me/availability',
  authenticate,
  requireRole('trainer'),
  AvailabilityController.updateMyAvailability
);

// GET /trainers/pending - list pending trainers (Requirements 10.6)
router.get('/pending', authenticate, requireRole('admin'), TrainerController.getPendingTrainers);

// GET /trainers - get all trainers
router.get('/', authenticate, TrainerController.getAllTrainers);

// GET /trainers/approved - get approved trainers
router.get('/approved', TrainerController.getApprovedTrainers);

router.get('/:id/slots', authenticate, AvailabilityController.getTrainerSlots);

// GET /trainers/:id - get trainer by id
router.get('/:id', authenticate, TrainerController.getTrainerById);

export default router;

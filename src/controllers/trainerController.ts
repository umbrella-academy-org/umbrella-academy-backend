import { Request, Response, NextFunction } from 'express';
import { TrainerService } from '../services/trainerService';

export class TrainerController {
  // GET /trainers/pending - list pending trainers (Requirements 10.6)
  static async getPendingTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await TrainerService.getPendingTrainers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  // GET /trainers - get all trainers
  static async getAllTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const trainers = await TrainerService.getAllTrainers();
      res.json({ success: true, data: trainers });
    } catch (err) {
      next(err);
    }
  }

  // GET /trainers/:id - get trainer by id
  static async getTrainerById(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.id as string;
      const trainer = await TrainerService.getTrainerById(trainerId);
      
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }
      
      res.json({ success: true, data: trainer });
    } catch (err) {
      next(err);
    }
  }

  // GET /trainers/approved - get approved trainers
  static async getApprovedTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const trainers = await TrainerService.getApprovedTrainers();
      res.json({ success: true, data: trainers });
    } catch (err) {
      next(err);
    }
  }
}

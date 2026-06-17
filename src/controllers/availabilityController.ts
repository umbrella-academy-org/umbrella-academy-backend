import { Request, Response, NextFunction } from 'express';
import { AvailabilityService } from '../services/availabilityService';

export class AvailabilityController {
  static async getMyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.user!.userId;
      const availability = await AvailabilityService.getTrainerAvailability(trainerId);
      res.json({ success: true, data: availability });
    } catch (err) {
      next(err);
    }
  }

  static async updateMyAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.user!.userId;
      const availability = await AvailabilityService.updateTrainerAvailability(trainerId, req.body);
      res.json({ success: true, data: availability, message: 'Availability updated' });
    } catch (err) {
      next(err);
    }
  }

  static async getTrainerSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.id as string;
      const date = String(req.query.date || '');
      if (!date) {
        return res.status(400).json({ success: false, message: 'date query parameter is required' });
      }

      const slots = await AvailabilityService.getAvailableSlots(trainerId, date);
      res.json({ success: true, data: slots });
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid date') {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService';

export class StatsController {
  // GET /api/stats/me - returns role-specific dashboard statistics
  static async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;

      switch (role) {
        case 'student': {
          const stats = await StatsService.getStudentStats(userId);
          return res.json({ success: true, data: stats });
        }
        
        case 'trainer': {
          const stats = await StatsService.getTrainerStats(userId);
          return res.json({ success: true, data: stats });
        }
        
        case 'admin': {
          const stats = await StatsService.getAdminStats();
          return res.json({ success: true, data: stats });
        }
        
        default:
          return res.status(400).json({ success: false, message: 'Unsupported role for stats' });
      }
    } catch (err) {
      next(err);
    }
  }
}

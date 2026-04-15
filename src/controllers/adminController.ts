import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService';

export class AdminController {
  // GET /api/admin/analytics - platform-wide stats
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await StatsService.getPlatformAnalytics();
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }
}

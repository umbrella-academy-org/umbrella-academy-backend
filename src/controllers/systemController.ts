import { Request, Response, NextFunction } from 'express';
import { SystemService } from '../services/systemService';

export class SystemController {
  // GET /api/system - returns system health metrics, alerts, and service statuses
  static async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const healthData = await SystemService.getSystemHealth();
      
      res.json({
        success: true,
        data: healthData,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/system/database - get database statistics
  static async getDatabaseStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SystemService.getDatabaseStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unable to fetch')) {
        return res.status(500).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // GET /api/system/memory - get memory usage statistics
  static async getMemoryUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const memoryData = await SystemService.getMemoryUsage();
      
      res.json({
        success: true,
        data: memoryData,
      });
    } catch (err) {
      next(err);
    }
  }
}

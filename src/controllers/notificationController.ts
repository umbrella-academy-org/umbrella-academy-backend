import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await NotificationService.getUserNotifications(userId);
      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await NotificationService.getUnreadCount(userId);
      res.json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id as string;
      const notification = await NotificationService.markAsRead(notificationId, userId);
      res.json({ success: true, data: notification });
    } catch (err) {
      if (err instanceof Error && err.message === 'Notification not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await NotificationService.markAllAsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }
}

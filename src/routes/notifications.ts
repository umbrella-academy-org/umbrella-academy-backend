import { Router, Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notifications - return unread notifications for authenticated user
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({
      userId: req.user!.userId,
      isRead: false,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id - mark notification as read
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

export default router;

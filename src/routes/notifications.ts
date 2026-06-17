import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationController } from '../controllers/notificationController';

const router = Router();

router.get('/', authenticate, NotificationController.getNotifications);
router.get('/unread-count', authenticate, NotificationController.getUnreadCount);
router.patch('/read-all', authenticate, NotificationController.markAllAsRead);
router.patch('/:id/read', authenticate, NotificationController.markAsRead);

export default router;

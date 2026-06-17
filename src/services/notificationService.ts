import { AppNotificationModel, AppNotificationCategory } from '../models/AppNotification';
import { notificationEmitter } from './socket';

export class NotificationService {
  static formatNotification(doc: {
    _id: unknown;
    userId: string;
    title: string;
    message: string;
    category: AppNotificationCategory;
    isRead: boolean;
    readAt?: Date | null;
    actionUrl?: string | null;
    relatedEntityId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      _id: String(doc._id),
      userId: doc.userId,
      title: doc.title,
      message: doc.message,
      category: doc.category,
      isRead: doc.isRead,
      readAt: doc.readAt ?? null,
      actionUrl: doc.actionUrl ?? null,
      relatedEntityId: doc.relatedEntityId ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static async create(params: {
    userId: string;
    title: string;
    message: string;
    category: AppNotificationCategory;
    actionUrl?: string;
    relatedEntityId?: string;
  }) {
    const notification = await AppNotificationModel.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
      category: params.category,
      actionUrl: params.actionUrl ?? null,
      relatedEntityId: params.relatedEntityId ?? null,
    });

    const formatted = this.formatNotification(notification.toObject());
    notificationEmitter.emit('notify', params.userId, formatted);
    return formatted;
  }

  static async getUserNotifications(userId: string, limit = 50) {
    const notifications = await AppNotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications.map((notification) => this.formatNotification(notification));
  }

  static async getUnreadCount(userId: string) {
    return AppNotificationModel.countDocuments({ userId, isRead: false });
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await AppNotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.formatNotification(notification.toObject());
  }

  static async markAllAsRead(userId: string) {
    await AppNotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }
}

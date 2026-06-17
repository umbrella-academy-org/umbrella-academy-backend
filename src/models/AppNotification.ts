import { Schema, model, Document } from 'mongoose';

export type AppNotificationCategory =
  | 'booking'
  | 'project'
  | 'certificate'
  | 'roadmap'
  | 'system';

export interface AppNotificationDocument extends Document {
  userId: string;
  title: string;
  message: string;
  category: AppNotificationCategory;
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  relatedEntityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AppNotificationSchema = new Schema<AppNotificationDocument>(
  {
    userId: { type: String, required: true, ref: 'User', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['booking', 'project', 'certificate', 'roadmap', 'system'],
      default: 'system',
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    actionUrl: { type: String, default: null },
    relatedEntityId: { type: String, default: null },
  },
  { timestamps: true }
);

AppNotificationSchema.index({ userId: 1, createdAt: -1 });

export const AppNotificationModel = model<AppNotificationDocument>(
  'AppNotification',
  AppNotificationSchema
);

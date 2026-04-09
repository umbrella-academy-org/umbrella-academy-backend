import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'roadmap-submitted'
  | 'roadmap-approved'
  | 'roadmap-rejected'
  | 'session-scheduled'
  | 'payment-completed';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Types.ObjectId;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'roadmap-submitted',
        'roadmap-approved',
        'roadmap-rejected',
        'session-scheduled',
        'payment-completed',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default model<INotification>('Notification', NotificationSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface ILiveSession extends Document {
  title: string;
  studentId: Types.ObjectId;
  trainerId: Types.ObjectId;
  type: 'roadmap-creation' | 'learning-session';
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  meetingUrl?: string;
}

const LiveSessionSchema = new Schema<ILiveSession>(
  {
    title: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['roadmap-creation', 'learning-session'] },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduledAt: { type: Date, required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    meetingUrl: { type: String },
  },
  { timestamps: true }
);

export default model<ILiveSession>('LiveSession', LiveSessionSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface IFeedbackTicket extends Document {
  type: 'feedback' | 'support' | 'complaint' | 'suggestion';
  userId: Types.ObjectId;
  subject: string;
  message: string;
  rating?: number;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  resolvedAt?: Date;
  assignedTo?: string;
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackTicketSchema = new Schema<IFeedbackTicket>(
  {
    type: {
      type: String,
      enum: ['feedback', 'support', 'complaint', 'suggestion'],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    rating: { type: Number },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    resolvedAt: { type: Date },
    assignedTo: { type: String },
    adminResponse: { type: String },
  },
  { timestamps: true }
);

export default model<IFeedbackTicket>('FeedbackTicket', FeedbackTicketSchema);

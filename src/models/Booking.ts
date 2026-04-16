import { Schema, model, Document, Types } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface StudentBookingRequest {
  trainerId: string;
  requestedTime: Date;
  learningGoals: string;
}

export interface Booking extends Document {
  id: string;
  studentId: string;
  trainerId: string;
  requestedTime: Date;
  learningGoals: string;
  status: BookingStatus;
  rejectionReason?: string;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Booking Schema
const BookingSchema = new Schema<Booking>({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, ref: 'User' },
  trainerId: { type: String, required: true, ref: 'User' },
  requestedTime: { type: Date, required: true },
  learningGoals: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.PENDING
  },
  rejectionReason: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Indexes for better query performance
BookingSchema.index({ studentId: 1, status: 1 });
BookingSchema.index({ trainerId: 1, status: 1 });
BookingSchema.index({ requestedTime: 1 });

export const BookingModel = model<Booking>('Booking', BookingSchema);

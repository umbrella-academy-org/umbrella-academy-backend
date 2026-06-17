import mongoose, { Schema, Document } from 'mongoose';
import { LeadStatus } from './Dashboard';

export interface SalesLeadDocument extends Document {
  student: string;
  fullName: string;
  email: string;
  phone: string;
  signupDate: Date;
  status: LeadStatus;
  lastContactedAt: Date | null;
  notes: string;
}

const salesLeadSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    signupDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
    },
    lastContactedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const SalesLeadModel = mongoose.model<SalesLeadDocument>('SalesLead', salesLeadSchema);

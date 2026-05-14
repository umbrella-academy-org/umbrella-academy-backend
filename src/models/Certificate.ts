import { Schema, model, Document } from 'mongoose';

export interface Certificate extends Document {
  id: string;
  certificateNumber: string;    // Unique ID
  student: string;
  studentName: string;
  milestoneId: string;
  milestoneName: string;
  trainer: string;
  trainerName: string;
  completionDate: Date;
  pdfUrl: string;              // Auto-generated link
}

// Schema
const CertificateSchema = new Schema<Certificate>({
  id: { type: String, required: true },
  certificateNumber: { type: String, required: true, unique: true },
  student: { type: String, required: true ,ref: 'User'},
  studentName: { type: String, required: true },
  milestoneId: { type: String, required: true },
  milestoneName: { type: String, required: true },
  trainer: { type: String, required: true,ref:'User' },
  trainerName: { type: String, required: true },
  completionDate: { type: Date, required: true },
  pdfUrl: { type: String, required: true }
});

// Model
export const CertificateModel = model<Certificate>('Certificate', CertificateSchema);
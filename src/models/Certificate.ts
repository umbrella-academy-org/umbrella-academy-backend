import { Schema, model, Document } from 'mongoose';

export interface Certificate extends Document {
  certificateNumber: string;
  student: string;
  studentName: string;
  roadmapId: string;
  milestoneId: string;
  milestoneName: string;
  trainer: string;
  trainerName: string;
  completionDate: Date;
  pdfUrl: string;
}

const CertificateSchema = new Schema<Certificate>(
  {
    certificateNumber: { type: String, required: true, unique: true },
    student: { type: String, required: true, ref: 'User', index: true },
    studentName: { type: String, required: true },
    roadmapId: { type: String, required: true },
    milestoneId: { type: String, required: true },
    milestoneName: { type: String, required: true },
    trainer: { type: String, required: true, ref: 'User' },
    trainerName: { type: String, required: true },
    completionDate: { type: Date, required: true },
    pdfUrl: { type: String, required: true },
  },
  { timestamps: true }
);

CertificateSchema.index({ student: 1, roadmapId: 1, milestoneId: 1 }, { unique: true });

export const CertificateModel = model<Certificate>('Certificate', CertificateSchema);

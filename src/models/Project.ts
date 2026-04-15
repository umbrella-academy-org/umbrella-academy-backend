import { Schema, model, Document } from 'mongoose';

export enum ProjectStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface ProjectEvidence {
  demoLink?: string;
  videoDemoLink?: string;
  designLink?: string;          // Figma, Adobe XD
  documentationLink?: string;
  fileDownloadLink?: string;
  externalLink?: string;        // Any external URL
}

export interface Project extends Document {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: string;             // e.g., "Robotics", "UI/UX", "Coding"
  toolsUsed: string[];
  studentRole: string;
  evidence: ProjectEvidence;
  attachments: {
    images: string[];           // URLs
    pdfs: string[];             // URLs
  };
  status: ProjectStatus;
  trainerFeedback?: string;
  approvedByTrainerId?: string;
  approvedAt?: Date;
  isPublic: boolean;            // Visible on public profile
  createdAt: Date;
}

// Schemas
const ProjectEvidenceSchema = new Schema<ProjectEvidence>({
  demoLink: { type: String, default: undefined },
  videoDemoLink: { type: String, default: undefined },
  designLink: { type: String, default: undefined },
  documentationLink: { type: String, default: undefined },
  fileDownloadLink: { type: String, default: undefined },
  externalLink: { type: String, default: undefined }
});

const AttachmentsSchema = new Schema({
  images: [{ type: String }],
  pdfs: [{ type: String }]
});

const ProjectSchema = new Schema<Project>({
  id: { type: String, required: true },
  studentId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  toolsUsed: [{ type: String, required: true }],
  studentRole: { type: String, required: true },
  evidence: { type: ProjectEvidenceSchema, default: () => ({}) },
  attachments: { type: AttachmentsSchema, default: () => ({ images: [], pdfs: [] }) },
  status: { 
    type: String, 
    enum: Object.values(ProjectStatus), 
    required: true 
  },
  trainerFeedback: { type: String, default: undefined },
  approvedByTrainerId: { type: String, default: undefined },
  approvedAt: { type: Date, default: undefined },
  isPublic: { type: Boolean, required: true },
  createdAt: { type: Date, required: true }
});

// Model
export const ProjectModel = model<Project>('Project', ProjectSchema);
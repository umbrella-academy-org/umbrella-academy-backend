import { Schema, model, Document, Types } from 'mongoose';

export type RoadmapStatus = 'draft' | 'pending-approval' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
export type PhaseStatus = 'pending' | 'active' | 'completed';
export type SessionStatus = 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

export enum RoadmapStepStatus {
  LOCKED = 'locked',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export interface Milestone {
  title: string;
  description: string;
  skillsToLearn: string[];
  tasks: string[];
  requiredProjects: string[];
  estimatedDurationDays: number;
  order: number;
  status: RoadmapStepStatus;
  completedAt: Date | null;
  trainerFeedback?: string;
}

export interface Roadmap extends Document {
  studentId: string;
  trainerId: string;
  title: string;
  status: RoadmapStatus;
  approvedBy?: string; 
  approvedAt?: Date;
  rejectionReason?: string;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

// Schemas
const MilestoneSchema = new Schema<Milestone>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skillsToLearn: [{ type: String, required: true }],
  tasks: [{ type: String, required: true }],
  requiredProjects: [{ type: String, required: true }],
  estimatedDurationDays: { type: Number, required: true },
  order: { type: Number, required: true },
  status: { 
    type: String, 
    enum: Object.values(RoadmapStepStatus), 
    required: true 
  },
  completedAt: { type: Date, default: null },
  trainerFeedback: { type: String, default: undefined }
});

const RoadmapSchema = new Schema<Roadmap>({
  studentId: { type: String, required: true },
  trainerId: { type: String, required: true },
  title: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'pending-approval', 'approved', 'active', 'paused', 'completed', 'rejected'], 
    default: 'draft' 
  },
  approvedBy: { type: String, default: null }, // Admin ID who approved
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  milestones: [MilestoneSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Models
export const RoadmapModel = model<Roadmap>('Roadmap', RoadmapSchema);



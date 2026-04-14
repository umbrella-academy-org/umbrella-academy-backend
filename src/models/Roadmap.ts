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

export interface OrientationBooking {
  id: string;
  studentId: string;
  trainerId: string;           // Selected mentor
  requestedTime: Date;
  alternativeTime?: Date;
  learningGoals: string;       // Message field
  status: BookingStatus;
  rejectionReason?: string;
  meetingLink?: string;        // Generated after approval
  createdAt: Date;
}
export interface Milestone {
  id: string;
  roadmapId: string;
  title: string;               // e.g., "Web Fundamentals"
  description: string;
  skillsToLearn: string[];
  tasks: string[];
  requiredProjects: string[];   // List of project descriptions/titles
  estimatedDurationDays: number;
  order: number;
  status: RoadmapStepStatus;
  completedAt: Date | null;
  trainerFeedback?: string;
}

export interface Roadmap {
  id: string;
  studentId: string;
  trainerId: string;
  title: string; // e.g., "Full Stack Developer Path"
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  title?: string;
  description?: string;
  duration?: number; // hours
  scheduledAt?: Date;
  completedAt?: Date;
  status?: SessionStatus;
  materials?: string[];
  objectives?: string[];
}

export interface IPhase {
  title?: string;
  description?: string;
  objectives?: string[];
  estimatedHours?: number;
  status: PhaseStatus;
  order?: number;
  sessions?: ISession[];
}

export interface IProgress {
  overallProgress: number;
  completedPhases: number;
  totalPhases: number;
  completedSessions: number;
  totalSessions: number;
}

export interface IRoadmap extends Document {
  title: string;
  description?: string;
  studentId: Types.ObjectId;
  trainerId?: Types.ObjectId;
  status: RoadmapStatus;
  difficulty?: Difficulty;
  estimatedDuration?: number; // weeks
  approvalNotes?: string;
  approvedAt?: Date;
  phases?: IPhase[];
  progress: IProgress;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    title: { type: String },
    description: { type: String },
    duration: { type: Number },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    },
    materials: [{ type: String }],
    objectives: [{ type: String }],
  },
  { _id: true }
);

const phaseSchema = new Schema<IPhase>(
  {
    title: { type: String },
    description: { type: String },
    objectives: [{ type: String }],
    estimatedHours: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending',
    },
    order: { type: Number },
    sessions: [sessionSchema],
  },
  { _id: true }
);

const progressSchema = new Schema<IProgress>(
  {
    overallProgress: { type: Number, default: 0 },
    completedPhases: { type: Number, default: 0 },
    totalPhases: { type: Number, default: 0 },
    completedSessions: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
  },
  { _id: false }
);

const roadmapSchema = new Schema<IRoadmap>(
  {
    title: { type: String, required: true },
    description: { type: String },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'pending-approval', 'approved', 'active', 'paused', 'completed', 'rejected'],
      default: 'draft',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    estimatedDuration: { type: Number },
    approvalNotes: { type: String },
    approvedAt: { type: Date },
    phases: [phaseSchema],
    progress: { type: progressSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default model<IRoadmap>('Roadmap', roadmapSchema);

import { Schema, model, Document } from 'mongoose';
import { Certificate } from './Certificate';
import { Project } from './Project';

export enum UserRole {
  STUDENT = 'student',
  GUARDIAN = 'guardian',
  TRAINER = 'trainer',
  SALES_MANAGER = 'sales_manager',
  ADMIN = 'admin'
}

export enum GuardianInviteState {
  INVITED = 'invited',
  ACTIVE = 'active',
  DECLINED = 'declined'
}

export interface Availability {
  weeklyAvailableHours?: number;
  preferredTimeSlots?: string[];
  preferredDays?: string[];
}

export interface OnboardingChecklist {
  accountCreated: boolean; // Always true after signup
  orientationBooked: boolean;
  roadmapReceived: boolean;
  learningStarted: boolean;
}

export interface Experience {
  yearsOfExperience?: number;
  specializations?: string[];
}

export interface BaseUser extends Document {
  email: string;
  password: string; 
  firstName: string;
  lastName: string;
  phone?: string;
  phoneCode?: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  status: string;
  gender?: string;
  dateOfBirth?: Date;
  isVerified: boolean;
  otpCode?: string;
  otpExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Guardian extends BaseUser {
  role: UserRole.GUARDIAN;
  linkedStudentIds: string[];
  inviteState: GuardianInviteState;
  inviteSentAt: Date;
  passwordSetAt: Date | null;
}

export interface Student extends BaseUser {
  role: UserRole.STUDENT;
  guardianIds: string[];
  hasPaidOrientation: boolean;
  hasActiveSubscription: boolean;
  subscriptionExpiryDate: Date | null;
  onboardingStatus: OnboardingChecklist;
  assignedTrainerId: string | null;
  currentRoadmapId: string | null;
  educationLevel?: string;
}

export interface Trainer extends BaseUser {
  role: UserRole.TRAINER;
  cvUrl?: string;           
  experience?: Experience;
  skills?: string[];        
  availabilityCalendar?: Availability;
  bio?: string;
  educationLevel?: string;
  educationTitle?: string;
  school?: string;
  yearOfCompletion?: string;
  availability?: string;
  proofDocuments?: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
}

export interface TrainerApplicationForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  cvUrl: string;           
  experience: Experience;
  skills: string[];        
  availabilityCalendar: string; 
  introVideoUrl: string;
}

export interface PublicStudentProfile {
  studentId: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  certificates: Certificate[];
  approvedProjects: Project[];
  mentorFeedback: string[];     // Array of testimonials
}

// Mongoose Base User Schema
const userSchema = new Schema<BaseUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String },
  phoneCode: { type: String },
  phoneNumber: { type: String },
  role: { type: String, enum: Object.values(UserRole), required: true },
  isActive: { type: Boolean, default: true },
  status: { type: String, default: 'active' },
  gender: { type: String },
  dateOfBirth: { type: Date },
  isVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpiry: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
}, { timestamps: true, discriminatorKey: 'role' });


// Student Discriminator
const studentSchema = new Schema({
  guardianIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  hasPaidOrientation: { type: Boolean, default: false },
  hasActiveSubscription: { type: Boolean, default: false },
  subscriptionExpiryDate: { type: Date, default: null },
  onboardingStatus: {
    accountCreated: { type: Boolean, default: true },
    orientationBooked: { type: Boolean, default: false },
    roadmapReceived: { type: Boolean, default: false },
    learningStarted: { type: Boolean, default: false }
  },
  assignedTrainerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  currentRoadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', default: null },
  educationLevel: { type: String },
});

// Trainer Discriminator
const trainerSchema = new Schema({
  cvUrl: { type: String },
  experience: {
    yearsOfExperience: { type: Number },
    specializations: [String]
  },
  skills: [String],
  availabilityCalendar: {
    weeklyAvailableHours: { type: Number },
    preferredTimeSlots: [String],
    preferredDays: [String]
  },
  bio: { type: String },
  educationLevel: { type: String },
  educationTitle: { type: String },
  school: { type: String },
  yearOfCompletion: { type: String },
  availability: { type: String },
  proofDocuments: [{ type: String }],
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', null], 
    default: null 
  }
});


// Guardian Discriminator
const guardianSchema = new Schema({
  linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  inviteState: { 
    type: String, 
    enum: Object.values(GuardianInviteState), 
    default: GuardianInviteState.INVITED 
  },
  inviteSentAt: { type: Date, default: Date.now },
  passwordSetAt: { type: Date, default: null }
});
// Base Model
export const UserModel = model<BaseUser>('User', userSchema);
export const GuardianModel = UserModel.discriminator<Guardian>(UserRole.GUARDIAN, guardianSchema);
export const TrainerModel = UserModel.discriminator<Trainer>(UserRole.TRAINER, trainerSchema);
export const AdminModel = UserModel.discriminator<BaseUser>(UserRole.ADMIN, new Schema({}));
export const SalesManagerModel = UserModel.discriminator<BaseUser>(UserRole.SALES_MANAGER, new Schema({}));
export const StudentModel = UserModel.discriminator<Student>(UserRole.STUDENT, studentSchema);

export default UserModel;

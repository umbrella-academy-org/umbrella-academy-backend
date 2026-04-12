import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'student' | 'trainer' | 'mentor' | 'field-admin' | 'umbrella-admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IAvailability {
  weeklyAvailableHours?: number;
  preferredTimeSlots?: string[];
  preferredDays?: string[];
}

export interface ILearningPreferences {
  pace?: string;
  style?: string;
}

export interface IExperience {
  yearsOfExperience?: number;
  specializations?: string[];
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  fieldId?: string;
  companyId?: string;
  status: UserStatus;
  avatar?: string;
  isVerified: boolean;
  // Shared profile fields
  gender?: string;
  dateOfBirth?: string;
  phoneCode?: string;
  phoneNumber?: string;
  // Student-specific
  educationLevel?: string;
  availability?: IAvailability;
  learningPreferences?: ILearningPreferences;
  trainerId?: Types.ObjectId;
  mentorId?: Types.ObjectId;
  // Trainer/Mentor-specific
  bio?: string;
  educationTitle?: string;
  school?: string;
  yearOfCompletion?: string;
  proofDocuments?: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  expertise?: string[];
  experience?: IExperience;
  // Admin-specific
  permissions?: string[];
  // OTP / password-reset fields
  otpCode?: string;
  otpExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    weeklyAvailableHours: { type: Number },
    preferredTimeSlots: [{ type: String }],
    preferredDays: [{ type: String }],
  },
  { _id: false }
);

const learningPreferencesSchema = new Schema<ILearningPreferences>(
  {
    pace: { type: String },
    style: { type: String },
  },
  { _id: false }
);

const experienceSchema = new Schema<IExperience>(
  {
    yearsOfExperience: { type: Number },
    specializations: [{ type: String }],
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'trainer', 'mentor', 'field-admin', 'umbrella-admin'],
      required: true,
    },
    fieldId: { type: String, default: "" },
    companyId: { type: String, default: "" },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    avatar: { type: String },
    // Shared profile fields
    gender: { type: String },
    dateOfBirth: { type: String },
    phoneCode: { type: String },
    phoneNumber: { type: String },
    // Student-specific
    educationLevel: { type: String },
    availability: { type: availabilitySchema },
    learningPreferences: { type: learningPreferencesSchema },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Trainer/Mentor-specific
    bio: { type: String },
    educationTitle: { type: String },
    school: { type: String },
    yearOfCompletion: { type: String },
    proofDocuments: [{ type: String }],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: null,
    },
    expertise: [{ type: String }],
    experience: { type: experienceSchema },
    // Admin-specific
    permissions: [{ type: String }],
    // OTP / password-reset fields
    otpCode: { type: String },
    otpExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

export default model<IUser>('User', userSchema);

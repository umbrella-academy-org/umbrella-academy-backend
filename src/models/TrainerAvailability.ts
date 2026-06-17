import mongoose, { Schema, Document } from 'mongoose';

export interface WeeklySlot {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface BlockedDate {
  date: Date;
  reason?: string;
}

export interface TrainerAvailability extends Document {
  trainer: string;
  timezone: string;
  weeklySchedule: WeeklySlot[];
  slotDurationMinutes: number;
  blockedDates: BlockedDate[];
}

const weeklySlotSchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    enabled: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
  },
  { _id: false }
);

const blockedDateSchema = new Schema(
  {
    date: { type: Date, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const defaultWeeklySchedule: WeeklySlot[] = [
  { dayOfWeek: 0, enabled: false, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 1, enabled: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 2, enabled: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 3, enabled: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 4, enabled: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 5, enabled: true, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 6, enabled: false, startTime: '09:00', endTime: '17:00' },
];

const trainerAvailabilitySchema = new Schema(
  {
    trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    timezone: { type: String, default: 'Africa/Kigali' },
    weeklySchedule: { type: [weeklySlotSchema], default: defaultWeeklySchedule },
    slotDurationMinutes: { type: Number, default: 60 },
    blockedDates: { type: [blockedDateSchema], default: [] },
  },
  { timestamps: true }
);

export const TrainerAvailabilityModel = mongoose.model<TrainerAvailability>(
  'TrainerAvailability',
  trainerAvailabilitySchema
);

export { defaultWeeklySchedule };

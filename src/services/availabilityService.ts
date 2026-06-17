import { BookingModel, BookingStatus } from '../models/Booking';
import {
  TrainerAvailabilityModel,
  WeeklySlot,
  defaultWeeklySchedule,
} from '../models/TrainerAvailability';

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toDateOnly(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return date.toISOString().split('T')[0];
}

export class AvailabilityService {
  static async getOrCreateAvailability(trainerId: string) {
    let availability = await TrainerAvailabilityModel.findOne({ trainer: trainerId });
    if (!availability) {
      availability = await TrainerAvailabilityModel.create({
        trainer: trainerId,
        weeklySchedule: defaultWeeklySchedule,
      });
    }
    return availability;
  }

  static formatAvailability(availability: {
    trainer: unknown;
    timezone: string;
    weeklySchedule: WeeklySlot[];
    slotDurationMinutes: number;
    blockedDates: { date: Date; reason?: string }[];
  }) {
    return {
      trainerId: String(availability.trainer),
      timezone: availability.timezone,
      weeklySchedule: availability.weeklySchedule,
      slotDurationMinutes: availability.slotDurationMinutes,
      blockedDates: availability.blockedDates.map((entry) => ({
        date: toDateOnly(entry.date),
        reason: entry.reason || '',
      })),
    };
  }

  static async getTrainerAvailability(trainerId: string) {
    const availability = await this.getOrCreateAvailability(trainerId);
    return this.formatAvailability(availability);
  }

  static async updateTrainerAvailability(
    trainerId: string,
    payload: {
      timezone?: string;
      weeklySchedule?: WeeklySlot[];
      slotDurationMinutes?: number;
      blockedDates?: { date: string; reason?: string }[];
    }
  ) {
    const availability = await this.getOrCreateAvailability(trainerId);

    if (payload.timezone) availability.timezone = payload.timezone;
    if (payload.weeklySchedule) availability.weeklySchedule = payload.weeklySchedule;
    if (payload.slotDurationMinutes) availability.slotDurationMinutes = payload.slotDurationMinutes;
    if (payload.blockedDates) {
      availability.blockedDates = payload.blockedDates.map((entry) => ({
        date: new Date(`${entry.date}T00:00:00`),
        reason: entry.reason || '',
      }));
    }

    await availability.save();
    return this.formatAvailability(availability);
  }

  static async getAvailableSlots(trainerId: string, date: string) {
    const availability = await this.getOrCreateAvailability(trainerId);
    const day = new Date(`${date}T00:00:00`);
    if (Number.isNaN(day.getTime())) {
      throw new Error('Invalid date');
    }

    const isBlocked = availability.blockedDates.some(
      (entry) => toDateOnly(entry.date) === date
    );
    if (isBlocked) {
      return [];
    }

    const daySchedule = availability.weeklySchedule.find(
      (slot) => slot.dayOfWeek === day.getDay()
    );
    if (!daySchedule?.enabled) {
      return [];
    }

    const startMinutes = parseTimeToMinutes(daySchedule.startTime);
    const endMinutes = parseTimeToMinutes(daySchedule.endTime);
    const duration = availability.slotDurationMinutes;
    const now = new Date();

    const bookings = await BookingModel.find({
      trainer: trainerId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.APPROVED] },
      requestedTime: {
        $gte: new Date(`${date}T00:00:00`),
        $lt: new Date(`${date}T23:59:59.999`),
      },
    }).select('requestedTime');

    const bookedTimes = new Set(
      bookings.map((booking) => new Date(booking.requestedTime).toISOString())
    );

    const slots: { startTime: string; isoTime: string }[] = [];

    for (let minute = startMinutes; minute + duration <= endMinutes; minute += duration) {
      const startTime = formatMinutesToTime(minute);
      const slotDate = new Date(`${date}T${startTime}:00`);
      if (slotDate <= now) continue;

      const isoTime = slotDate.toISOString();
      if (bookedTimes.has(isoTime)) continue;

      slots.push({ startTime, isoTime });
    }

    return slots;
  }

  static async assertSlotAvailable(trainerId: string, requestedTime: Date) {
    const date = toDateOnly(requestedTime);
    const slots = await this.getAvailableSlots(trainerId, date);
    const requestedIso = requestedTime.toISOString();

    const matchingSlot = slots.find((slot) => slot.isoTime === requestedIso);
    if (!matchingSlot) {
      throw new Error('Selected time is not within trainer availability');
    }
  }
}

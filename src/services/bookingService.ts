import { BookingModel, BookingStatus, Booking, StudentBookingRequest, TrainerApprovalRequest } from '../models/Booking';
import { StudentModel, TrainerModel } from '../models/User';
import { PaymentModel, PaymentType } from '../models/Payment';
import { ZoomService } from './zoomService';
import { queueSessionApprovedEmails } from './sessionEmailService';

type PopulatedUser = {
  _id?: unknown;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export class BookingService {
  private static formatUserRef(user: unknown) {
    if (!user) {
      return { _id: '', firstName: 'Unknown', lastName: '', email: '' };
    }

    if (typeof user === 'string') {
      return { _id: user, firstName: 'User', lastName: '', email: '' };
    }

    const populated = user as PopulatedUser;
    return {
      _id: String(populated._id ?? populated.id ?? ''),
      firstName: populated.firstName ?? '',
      lastName: populated.lastName ?? '',
      email: populated.email ?? '',
    };
  }

  private static formatBooking(booking: Booking | Record<string, unknown>) {
    const doc =
      typeof (booking as Booking).toObject === 'function'
        ? (booking as Booking).toObject()
        : booking;

    const record = doc as Record<string, unknown>;

    return {
      _id: String(record._id ?? ''),
      id: String(record.id ?? ''),
      student: this.formatUserRef(record.student),
      trainer: this.formatUserRef(record.trainer),
      requestedTime: record.requestedTime,
      learningGoals: record.learningGoals,
      status: record.status,
      rejectionReason: record.rejectionReason ?? undefined,
      approvalNotes: record.approvalNotes ?? undefined,
      sessionDuration: record.sessionDuration ?? undefined,
      sessionFormat: record.sessionFormat ?? undefined,
      sessionLocation: record.sessionLocation ?? undefined,
      zoomMeetingId: record.zoomMeetingId ?? undefined,
      preparationRequirements: record.preparationRequirements ?? undefined,
      nextSteps: record.nextSteps ?? undefined,
      approvedAt: record.approvedAt ?? undefined,
      completedAt: record.completedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  static async createBooking(studentId: string, bookingRequest: StudentBookingRequest) {
    const { trainerId, requestedTime, learningGoals } = bookingRequest;

    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const orientationPayment = await PaymentModel.findOne({
      student: studentId,
      type: PaymentType.ORIENTATION,
      status: 'success',
    });

    if (!orientationPayment) {
      throw new Error('Orientation payment must be completed before booking');
    }

    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    if (trainer.approvalStatus !== 'approved') {
      throw new Error('Trainer is not approved for bookings');
    }

    const existingPendingBooking = await BookingModel.findOne({
      student: studentId,
      status: BookingStatus.PENDING,
    });

    if (existingPendingBooking) {
      throw new Error('You already have a pending booking request');
    }

    const requestedDate = new Date(requestedTime);
    if (Number.isNaN(requestedDate.getTime()) || requestedDate <= new Date()) {
      throw new Error('Booking time must be in the future');
    }

    const conflictingBooking = await BookingModel.findOne({
      trainer: trainerId,
      requestedTime: {
        $gte: new Date(requestedDate.getTime() - 60 * 60 * 1000),
        $lte: new Date(requestedDate.getTime() + 60 * 60 * 1000),
      },
      status: { $in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
    });

    if (conflictingBooking) {
      throw new Error('Trainer is not available at the requested time');
    }

    const bookingId = this.generateBookingId();

    const booking = await BookingModel.create({
      id: bookingId,
      student: studentId,
      trainer: trainerId,
      requestedTime: requestedDate,
      learningGoals,
      status: BookingStatus.PENDING,
    });

    await StudentModel.findByIdAndUpdate(studentId, {
      'onboardingStatus.orientationBooked': true,
    });

    return this.formatBooking(booking);
  }

  static async getStudentBookings(studentId: string, status?: BookingStatus) {
    const filter: Record<string, unknown> = { student: studentId };
    if (status) {
      filter.status = status;
    }

    const bookings = await BookingModel.find(filter)
      .populate('trainer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return bookings.map((booking) => this.formatBooking(booking));
  }

  static async getTrainerBookings(trainerId: string, bookingStatus?: BookingStatus) {
    const filter: Record<string, unknown> = { trainer: trainerId };
    if (bookingStatus) {
      filter.status = bookingStatus;
    }

    const bookings = await BookingModel.find(filter)
      .populate('student', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return bookings.map((booking) => this.formatBooking(booking));
  }

  static async approveBooking(bookingId: string, trainerId: string, approvalData: TrainerApprovalRequest) {
    const booking = await BookingModel.findOne({ id: bookingId, trainer: trainerId })
      .populate('student', 'firstName lastName email')
      .populate('trainer', 'firstName lastName email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Booking cannot be approved in current status');
    }

    const {
      approvalNotes,
      sessionDuration,
      sessionFormat,
      sessionLocation = '',
      preparationRequirements = '',
      nextSteps = '',
    } = approvalData;

    if (!approvalNotes?.trim() || !sessionDuration || !sessionFormat) {
      throw new Error('Approval notes, duration, and format are required');
    }

    const student = this.formatUserRef(booking.student);
    const trainer = this.formatUserRef(booking.trainer);
    const studentName = `${student.firstName} ${student.lastName}`.trim() || 'Student';
    const trainerName = `${trainer.firstName} ${trainer.lastName}`.trim() || 'Trainer';

    let resolvedLocation = sessionLocation.trim();
    let zoomMeetingId: string | undefined;
    let zoomStartUrl: string | undefined;

    if (sessionFormat === 'online') {
      if (ZoomService.isConfigured()) {
        const zoomMeeting = await ZoomService.createMeeting({
          topic: `Dreamize Orientation — ${studentName}`,
          startTime: booking.requestedTime,
          durationMinutes: sessionDuration,
          agenda: booking.learningGoals,
        });
        resolvedLocation = zoomMeeting.joinUrl;
        zoomMeetingId = zoomMeeting.meetingId;
        zoomStartUrl = zoomMeeting.startUrl;
      } else if (!resolvedLocation) {
        throw new Error(
          'Zoom is not configured and no meeting link was provided. Add Zoom credentials or paste a meeting link.'
        );
      }
    } else if (!resolvedLocation) {
      throw new Error('A physical location is required for in-person sessions');
    }

    booking.status = BookingStatus.APPROVED;
    booking.approvedAt = new Date();
    booking.approvalNotes = approvalNotes.trim();
    booking.sessionDuration = sessionDuration;
    booking.sessionFormat = sessionFormat;
    booking.sessionLocation = resolvedLocation;
    booking.zoomMeetingId = zoomMeetingId;
    booking.preparationRequirements = preparationRequirements.trim();
    booking.nextSteps = nextSteps.trim();

    await booking.save();

    await StudentModel.findByIdAndUpdate(booking.student, {
      assignedTrainerId: trainerId,
    });

    if (student.email && trainer.email) {
      queueSessionApprovedEmails({
        studentName,
        studentEmail: student.email,
        trainerName,
        trainerEmail: trainer.email,
        sessionTime: booking.requestedTime,
        durationMinutes: sessionDuration,
        sessionFormat,
        joinUrl: sessionFormat === 'online' ? resolvedLocation : undefined,
        startUrl: zoomStartUrl,
        location: sessionFormat === 'in-person' ? resolvedLocation : undefined,
        approvalNotes: approvalNotes.trim(),
        preparationRequirements: preparationRequirements.trim(),
        nextSteps: nextSteps.trim(),
      });
    }

    return this.formatBooking(booking);
  }

  static async rejectBooking(bookingId: string, trainerId: string, rejectionReason: string) {
    const booking = await BookingModel.findOne({ id: bookingId, trainer: trainerId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Booking cannot be rejected in current status');
    }

    booking.status = BookingStatus.REJECTED;
    booking.rejectionReason = rejectionReason.trim();
    await booking.save();

    await StudentModel.findByIdAndUpdate(booking.student, {
      'onboardingStatus.orientationBooked': false,
    });

    return this.formatBooking(booking);
  }

  static async completeBooking(bookingId: string, trainerId: string) {
    const booking = await BookingModel.findOne({ id: bookingId, trainer: trainerId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new Error('Booking must be approved before completion');
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    await booking.save();

    return this.formatBooking(booking);
  }

  static async cancelBooking(bookingId: string, userId: string, userRole: string) {
    const booking = await BookingModel.findOne({ id: bookingId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    const studentId = String(booking.student);
    const bookingTrainerId = String(booking.trainer);

    if (userRole === 'student' && studentId !== userId) {
      throw new Error('You can only cancel your own bookings');
    }

    if (userRole === 'trainer' && bookingTrainerId !== userId) {
      throw new Error('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new Error('Cannot cancel completed bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    if (booking.zoomMeetingId) {
      await ZoomService.deleteMeeting(booking.zoomMeetingId);
    }

    booking.status = BookingStatus.CANCELLED;
    await booking.save();

    if (studentId === userId) {
      await StudentModel.findByIdAndUpdate(studentId, {
        'onboardingStatus.orientationBooked': false,
      });
    }

    return this.formatBooking(booking);
  }

  static async getAvailableTrainers() {
    const trainers = await TrainerModel.find({
      approvalStatus: 'approved',
      isActive: true,
    }).select('firstName lastName email skills experience');

    return trainers;
  }

  static async getBookingById(bookingId: string) {
    const booking = await BookingModel.findOne({ id: bookingId })
      .populate('student', 'firstName lastName email')
      .populate('trainer', 'firstName lastName email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    return this.formatBooking(booking);
  }

  static async getAllBookings(status?: BookingStatus) {
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const bookings = await BookingModel.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('trainer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return bookings.map((booking) => this.formatBooking(booking));
  }

  private static generateBookingId(): string {
    return `BK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

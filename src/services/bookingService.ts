import { BookingModel, BookingStatus, Booking, StudentBookingRequest, TrainerApprovalRequest } from '../models/Booking';
import { StudentModel, TrainerModel } from '../models/User';
import { PaymentModel, PaymentType } from '../models/Payment';

export class BookingService {
  static async createBooking(studentId: string, bookingRequest: StudentBookingRequest) {
    const { trainerId, requestedTime, learningGoals } = bookingRequest;

    // Validate student exists and has paid orientation
    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Check if student has paid orientation fee
    const orientationPayment = await PaymentModel.findOne({
      studentId,
      type: PaymentType.ORIENTATION,
      status: 'success'
    });

    if (!orientationPayment) {
      throw new Error('Orientation payment must be completed before booking');
    }

    // Validate trainer exists and is approved
    const trainer = await TrainerModel.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    if (trainer.approvalStatus !== 'approved') {
      throw new Error('Trainer is not approved for bookings');
    }

    // Check if student already has a pending booking
    const existingPendingBooking = await BookingModel.findOne({
      studentId,
      status: BookingStatus.PENDING
    });

    if (existingPendingBooking) {
      throw new Error('You already have a pending booking request');
    }

    // Validate requested time is in the future
    const requestedDate = new Date(requestedTime);
    if (requestedDate <= new Date()) {
      throw new Error('Booking time must be in the future');
    }

    // Check for scheduling conflicts with trainer
    const conflictingBooking = await BookingModel.findOne({
      trainerId,
      requestedTime: {
        $gte: new Date(requestedDate.getTime() - 60 * 60 * 1000), // 1 hour before
        $lte: new Date(requestedDate.getTime() + 60 * 60 * 1000)  // 1 hour after
      },
      status: { $in: [BookingStatus.APPROVED, BookingStatus.PENDING] }
    });

    if (conflictingBooking) {
      throw new Error('Trainer is not available at the requested time');
    }

    const bookingId = this.generateBookingId();

    const booking = await BookingModel.create({
      id: bookingId,
      studentId,
      trainerId,
      requestedTime: requestedDate,
      learningGoals,
      status: BookingStatus.PENDING
    });

    // Update student's onboarding status
    await StudentModel.findByIdAndUpdate(studentId, {
      'onboardingStatus.orientationBooked': true
    });

    return booking;
  }

  static async getStudentBookings(studentId: string, status?: BookingStatus) {
    const filter: any = { studentId };
    if (status) {
      filter.status = status;
    }

    const bookings = await BookingModel.find(filter)
      .populate('trainerId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    console.log(bookings)
    return bookings;
  }
  static async getTrainerBookings(trainerId: string, bookingStatus?: BookingStatus) {
    const filter: any = { trainerId };
    if (bookingStatus) {
      filter.status = bookingStatus;
    }

    const bookings = await BookingModel.find(filter)
      .populate('studentId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return bookings;
  }

  static async approveBooking(bookingId: string, trainerId: string, approvalData: TrainerApprovalRequest) {
    const booking = await BookingModel.findOne({ id: bookingId, trainerId });
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
      sessionLocation,
      preparationRequirements,
      nextSteps
    } = approvalData;

    // Validate approval data
    if (!approvalNotes || !sessionDuration || !sessionFormat || !sessionLocation || !preparationRequirements || !nextSteps) {
      throw new Error('All approval fields are required');
    }

    booking.status = BookingStatus.APPROVED;
    booking.approvedAt = new Date();
    booking.approvalNotes = approvalNotes;
    booking.sessionDuration = sessionDuration;
    booking.sessionFormat = sessionFormat;
    booking.sessionLocation = sessionLocation;
    booking.preparationRequirements = preparationRequirements;
    booking.nextSteps = nextSteps;
    
    await booking.save();

    // Assign trainer to student
    await StudentModel.findByIdAndUpdate(booking.studentId, {
      assignedTrainerId: trainerId
    });

    return booking;
  }

  static async rejectBooking(bookingId: string, trainerId: string, rejectionReason: string) {
    const booking = await BookingModel.findOne({ id: bookingId, trainerId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Booking cannot be rejected in current status');
    }

    booking.status = BookingStatus.REJECTED;
    booking.rejectionReason = rejectionReason;
    await booking.save();

    // Update student's onboarding status
    await StudentModel.findByIdAndUpdate(booking.studentId, {
      'onboardingStatus.orientationBooked': false
    });

    return booking;
  }

  static async completeBooking(bookingId: string, trainerId: string) {
    const booking = await BookingModel.findOne({ id: bookingId, trainerId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.APPROVED) {
      throw new Error('Booking must be approved before completion');
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    await booking.save();

    return booking;
  }

  static async cancelBooking(bookingId: string, userId: string, userRole: string) {
    const booking = await BookingModel.findOne({ id: bookingId });
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user has permission to cancel
    if (userRole === 'student' && booking.studentId !== userId) {
      throw new Error('You can only cancel your own bookings');
    }

    if (userRole === 'trainer' && booking.trainerId !== userId) {
      throw new Error('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new Error('Cannot cancel completed bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    booking.status = BookingStatus.CANCELLED;
    await booking.save();

    // Update student's onboarding status if this was an orientation booking
    if (booking.studentId === userId) {
      await StudentModel.findByIdAndUpdate(booking.studentId, {
        'onboardingStatus.orientationBooked': false
      });
    }

    return booking;
  }

  static async getAvailableTrainers() {
    const trainers = await TrainerModel.find({
      approvalStatus: 'approved',
      isActive: true
    }).select('firstName lastName email skills experience');

    return trainers;
  }

  static async getBookingById(bookingId: string) {
    const booking = await BookingModel.findOne({ id: bookingId })
      .populate('studentId', 'firstName lastName email')
      .populate('trainerId', 'firstName lastName email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  static async getAllBookings(status?: BookingStatus) {
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const bookings = await BookingModel.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('trainerId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return bookings;
  }

  private static generateBookingId(): string {
    return `BK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

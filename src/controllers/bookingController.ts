import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService';
import { BookingStatus } from '../models/Booking';

export class BookingController {
  // POST /bookings - create new booking (student only)
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { trainerId, requestedTime, learningGoals } = req.body;

      if (!trainerId || !requestedTime || !learningGoals) {
        return res.status(400).json({
          success: false,
          message: 'trainerId, requestedTime, and learningGoals are required'
        });
      }

      const booking = await BookingService.createBooking(userId, {
        trainerId,
        requestedTime,
        learningGoals
      });

      res.status(201).json({
        success: true,
        data: booking
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Student not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Orientation payment must be completed before booking') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Trainer not found' || err.message === 'Trainer is not approved for bookings') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'You already have a pending booking request') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Booking time must be in the future') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Trainer is not available at the requested time') {
          return res.status(409).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /bookings/student - get student's bookings
  static async getStudentBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query as { status?: BookingStatus };

      const bookings = await BookingService.getStudentBookings(userId, status);

      res.json({
        success: true,
        data: bookings
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /bookings/trainer - get trainer's bookings
  static async getTrainerBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query as { status?: BookingStatus };

      const bookings = await BookingService.getTrainerBookings(userId, status);

      res.json({
        success: true,
        data: bookings
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /bookings/:bookingId/approve - approve booking (trainer only)
  static async approveBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.user!.userId;
      const { bookingId } = req.params as { bookingId: string };

      const booking = await BookingService.approveBooking(bookingId, trainerId);

      res.json({
        success: true,
        data: booking,
        message: 'Booking approved successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Booking not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Booking cannot be approved in current status') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /bookings/:bookingId/reject - reject booking (trainer only)
  static async rejectBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.user!.userId;
      const { bookingId } = req.params as { bookingId: string };
      const { rejectionReason } = req.body as { rejectionReason: string };

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const booking = await BookingService.rejectBooking(bookingId, trainerId, rejectionReason);

      res.json({
        success: true,
        data: booking,
        message: 'Booking rejected successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Booking not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Booking cannot be rejected in current status') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /bookings/:bookingId/complete - complete booking (trainer only)
  static async completeBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.user!.userId;
      const { bookingId } = req.params as { bookingId: string };

      const booking = await BookingService.completeBooking(bookingId, trainerId);

      res.json({
        success: true,
        data: booking,
        message: 'Booking completed successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Booking not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Booking must be approved before completion') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /bookings/:bookingId/cancel - cancel booking (student or trainer)
  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { bookingId } = req.params as { bookingId: string };

      const booking = await BookingService.cancelBooking(bookingId, userId, userRole);

      res.json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Booking not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message.includes('You can only cancel your own bookings')) {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message.includes('Cannot cancel completed bookings') || 
            err.message === 'Booking is already cancelled') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /bookings/available-trainers - get list of available trainers
  static async getAvailableTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const trainers = await BookingService.getAvailableTrainers();

      res.json({
        success: true,
        data: trainers
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /bookings/:bookingId - get booking by ID
  static async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params as { bookingId: string };

      const booking = await BookingService.getBookingById(bookingId);

      res.json({
        success: true,
        data: booking
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Booking not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  // GET /bookings/admin/all - get all bookings (admin only)
  static async getAllBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: BookingStatus };

      const bookings = await BookingService.getAllBookings(status);

      res.json({
        success: true,
        data: bookings
      });
    } catch (err) {
      next(err);
    }
  }
}

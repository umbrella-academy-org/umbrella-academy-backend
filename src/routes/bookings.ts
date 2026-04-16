import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { BookingController } from '../controllers/bookingController';

const router = Router();

// Student booking endpoints
// POST /bookings - create new booking (student only)
router.post('/', authenticate, requireRole('student'), BookingController.createBooking);

// GET /bookings/student - get student's bookings
router.get('/student', authenticate, requireRole('student'), BookingController.getStudentBookings);

// GET /bookings/available-trainers - get list of available trainers
router.get('/available-trainers', authenticate, requireRole('student'), BookingController.getAvailableTrainers);

// Trainer booking management endpoints
// GET /bookings/trainer - get trainer's bookings
router.get('/trainer', authenticate, BookingController.getTrainerBookings);

// GET /bookings/:bookingId - get booking by ID
router.get('/:bookingId', authenticate, BookingController.getBookingById);

// POST /bookings/:bookingId/cancel - cancel booking (student or trainer)
router.post('/:bookingId/cancel', authenticate, BookingController.cancelBooking);

// POST /bookings/:bookingId // TODO: Fetch trainer pending bookings/approve - approve booking (trainer only)
router.post('/:bookingId/approve', authenticate, requireRole('trainer'), BookingController.approveBooking);

// POST /bookings/:bookingId/reject - reject booking (trainer only)
router.post('/:bookingId/reject', authenticate, requireRole('trainer'), BookingController.rejectBooking);

// POST /bookings/:bookingId/complete - complete booking (trainer only)
router.post('/:bookingId/complete', authenticate, requireRole('trainer'), BookingController.completeBooking);

// Admin booking management endpoints
// GET /bookings/admin/all - get all bookings (admin only)
router.get('/admin/all', authenticate, requireRole('admin'), BookingController.getAllBookings);

export default router;

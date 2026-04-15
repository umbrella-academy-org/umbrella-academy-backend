import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate, requireRole } from '../middleware/auth';
import LiveSession from '../models/LiveSession';

const router = Router();

// GET /api/sessions — list sessions for the authenticated user
// ?type=upcoming  → scheduledAt > now
// ?type=history   → status = 'completed'
// (no type)       → all sessions where user is participant
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const participantFilter = { $or: [{ studentId: userId }, { trainerId: userId }] };

    const { type } = req.query;

    let filter: Record<string, unknown>;

    if (type === 'upcoming') {
      filter = { ...participantFilter, scheduledAt: { $gt: new Date() } };
    } else if (type === 'history') {
      filter = { ...participantFilter, status: 'completed' };
    } else {
      filter = participantFilter;
    }

    const sessions = await LiveSession.find(filter).sort({ scheduledAt: 1 });
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions — create a new live session
router.post(
  '/',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, trainerId, scheduledAt, title, type } = req.body;

      const session = await LiveSession.create({
        studentId,
        trainerId,
        scheduledAt,
        title,
        type,
        status: 'scheduled',
      });

      // Create notifications for both participants
      const notificationMessage = `Live session "${title}" has been scheduled for ${new Date(scheduledAt).toLocaleString()}.`;

      // await Notification.insertMany([
      //   {
      //     userId: studentId,
      //     type: 'session-scheduled',
      //     title: 'Live Session Scheduled',
      //     message: notificationMessage,
      //     relatedId: session._id,
      //   },
      //   {
      //     userId: trainerId,
      //     type: 'session-scheduled',
      //     title: 'Live Session Scheduled',
      //     message: notificationMessage,
      //     relatedId: session._id,
      //   },
      // ]);

      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/sessions/:id — update session status (and record timestamps)
router.put(
  '/:id',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, ...rest } = req.body;

      const update: Record<string, unknown> = { ...rest };

      if (status) {
        update.status = status;
        if (status === 'live') {
          update.startedAt = new Date();
        } else if (status === 'completed') {
          update.completedAt = new Date();
        }
      }

      const session = await LiveSession.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import Roadmap, { IPhase, ISession } from '../models/Roadmap';
import Notification from '../models/Notification';
import { authenticate, requireRole } from '../middleware/auth';

// Helper to find a subdocument by string id from a plain array
function findPhase(arr: IPhase[] | undefined, id: string): IPhase | undefined {
  return arr?.find((item) => (item as any)._id?.toString() === id);
}
function findSession(arr: ISession[] | undefined, id: string): ISession | undefined {
  return arr?.find((item) => (item as any)._id?.toString() === id);
}

const router = Router();

// GET /api/roadmaps — role-scoped
// Requirements 3.5, 3.6, 3.7, 3.8
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role, fieldId } = req.user!;
    let filter: Record<string, unknown> = {};

    if (role === 'student') {
      filter = { studentId: userId };
    } else if (role === 'trainer') {
      filter = { trainerId: userId };
    } else if (role === 'company-admin') {
      filter = { fieldId };
    }
    // umbrella-admin: no filter — return all

    const roadmaps = await Roadmap.find(filter);
    res.json({ success: true, data: roadmaps });
  } catch (err) {
    next(err);
  }
});

// POST /api/roadmaps — create with status = 'draft'
// Requirements 3.1
router.post(
  '/',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, studentId, trainerId, fieldId, phases, difficulty, estimatedDuration } =
        req.body;

      const roadmap = await Roadmap.create({
        title,
        description,
        studentId,
        trainerId,
        fieldId,
        phases,
        difficulty,
        estimatedDuration,
        status: 'draft',
      });

      res.status(201).json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/roadmaps/:id
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);
    if (!roadmap) {
      res.status(404).json({ success: false, message: 'Roadmap not found' });
      return;
    }
    res.json({ success: true, data: roadmap });
  } catch (err) {
    next(err);
  }
});

// PUT /api/roadmaps/:id — update fields (not status)
router.put(
  '/:id',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, approvedAt, approvalNotes, ...updates } = req.body; // strip status-managed fields

      const roadmap = await Roadmap.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }
      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/roadmaps/:id/submit — set status = 'pending-approval', notify mentor
// Requirements 3.2, 10.1
router.post(
  '/:id/submit',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roadmap = await Roadmap.findByIdAndUpdate(
        req.params.id,
        { status: 'pending-approval' },
        { new: true }
      );
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      if (roadmap.trainerId) {
        await Notification.create({
          userId: roadmap.trainerId,
          type: 'roadmap-submitted',
          title: 'Roadmap Submitted for Approval',
          message: `Roadmap "${roadmap.title}" has been submitted for your approval.`,
          relatedId: roadmap._id,
        });
      }

      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/roadmaps/:id/approve — approve or reject, notify student and trainer
router.put(
  '/:id/approve',
  authenticate,
  requireRole('company-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { approved, approvalNotes } = req.body as { approved: boolean; approvalNotes?: string };

      const update: Record<string, unknown> = approved
        ? { status: 'approved', approvedAt: new Date() }
        : { status: 'rejected', approvalNotes };

      const roadmap = await Roadmap.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      const notifType = approved ? 'roadmap-approved' : 'roadmap-rejected';
      const notifTitle = approved ? 'Roadmap Approved' : 'Roadmap Rejected';
      const notifMessage = approved
        ? `Your roadmap "${roadmap.title}" has been approved.`
        : `Your roadmap "${roadmap.title}" has been rejected. Notes: ${approvalNotes ?? ''}`;

      const recipients = [roadmap.studentId, roadmap.trainerId].filter(Boolean);
      await Promise.all(
        recipients.map((userId) =>
          Notification.create({
            userId,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            relatedId: roadmap._id,
          })
        )
      );

      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// ── Nested phase/session CRUD ──────────────────────────────────────────────

// POST /api/roadmaps/:id/phases — add a phase
// Requirements 3.10
router.post(
  '/:id/phases',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roadmap = await Roadmap.findById(req.params.id);
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      roadmap.phases = roadmap.phases ?? [];
      roadmap.phases.push(req.body);
      await roadmap.save();

      res.status(201).json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/roadmaps/:id/phases/:phaseId — update a phase (including status)
// Requirements 3.10
router.put(
  '/:id/phases/:phaseId',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roadmap = await Roadmap.findById(req.params.id);
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      const phase = findPhase(roadmap.phases, req.params.phaseId as string);
      if (!phase) {
        res.status(404).json({ success: false, message: 'Phase not found' });
        return;
      }

      Object.assign(phase, req.body);

      // Recalculate progress when a phase status changes
      const phases = roadmap.phases ?? [];
      const totalPhases = phases.length;
      const completedPhases = phases.filter((p) => p.status === 'completed').length;
      const allSessions = phases.flatMap((p) => p.sessions ?? []);
      const totalSessions = allSessions.length;
      const completedSessions = allSessions.filter((s) => s.status === 'completed').length;

      roadmap.progress = {
        totalPhases,
        completedPhases,
        overallProgress: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
        totalSessions,
        completedSessions,
      };

      await roadmap.save();
      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/roadmaps/:id/phases/:phaseId/sessions — add a session to a phase
// Requirements 3.10
router.post(
  '/:id/phases/:phaseId/sessions',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roadmap = await Roadmap.findById(req.params.id);
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      const phase = findPhase(roadmap.phases, req.params.phaseId as string);
      if (!phase) {
        res.status(404).json({ success: false, message: 'Phase not found' });
        return;
      }

      phase.sessions = phase.sessions ?? [];
      phase.sessions.push(req.body);
      await roadmap.save();

      res.status(201).json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/roadmaps/:id/phases/:phaseId/sessions/:sessionId — update a session
// Requirements 3.10
router.put(
  '/:id/phases/:phaseId/sessions/:sessionId',
  authenticate,
  requireRole('student', 'trainer'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roadmap = await Roadmap.findById(req.params.id);
      if (!roadmap) {
        res.status(404).json({ success: false, message: 'Roadmap not found' });
        return;
      }

      const phase = findPhase(roadmap.phases, req.params.phaseId as string);
      if (!phase) {
        res.status(404).json({ success: false, message: 'Phase not found' });
        return;
      }

      const session = findSession(phase.sessions, req.params.sessionId as string);
      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      Object.assign(session, req.body);
      await roadmap.save();

      res.json({ success: true, data: roadmap });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

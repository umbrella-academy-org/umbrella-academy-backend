import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';

const router = Router();

// GET /api/chat/contacts — list distinct users the authenticated user has exchanged messages with
// Requirements: 5.4
router.get(
  '/contacts',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = new Types.ObjectId(req.user!.userId);

      // Find all messages involving this user
      const messages = await Message.find({
        $or: [{ senderId: userId }, { recipientId: userId }],
      }).select('senderId recipientId');

      // Collect distinct contact IDs
      const contactIdSet = new Set<string>();
      for (const msg of messages) {
        const other = msg.senderId.equals(userId) ? msg.recipientId : msg.senderId;
        contactIdSet.add(other.toString());
      }

      // For each contact, get the last message
      const contacts = await Promise.all(
        Array.from(contactIdSet).map(async (contactId) => {
          const contactObjId = new Types.ObjectId(contactId);

          const [user, lastMessage] = await Promise.all([
            User.findById(contactObjId).select('firstName lastName avatar role'),
            Message.findOne({
              $or: [
                { senderId: userId, recipientId: contactObjId },
                { senderId: contactObjId, recipientId: userId },
              ],
            })
              .sort({ createdAt: -1 })
              .select('text createdAt senderId recipientId isRead'),
          ]);

          return {
            contact: user,
            lastMessage,
            lastMessageAt: lastMessage?.createdAt ?? null,
          };
        })
      );

      // Sort contacts by most recent message descending
      contacts.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      });

      res.json({ success: true, data: contacts });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/chat/messages/:contactId — paginated message history between two users
// Requirements: 5.5, 5.7
router.get(
  '/messages/:contactId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = new Types.ObjectId(req.user!.userId);
      const contactId = new Types.ObjectId(req.params.contactId as string);

      const skip = parseInt(Array.isArray(req.query.skip) ? '0' : (req.query.skip as string) ?? '0', 10) || 0;
      const limit = parseInt(Array.isArray(req.query.limit) ? '50' : (req.query.limit as string) ?? '50', 10) || 50;

      const messages = await Message.find({
        $or: [
          { senderId: userId, recipientId: contactId },
          { senderId: contactId, recipientId: userId },
        ],
      })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit);

      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

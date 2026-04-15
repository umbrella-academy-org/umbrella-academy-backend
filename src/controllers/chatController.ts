import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService';

export class ChatController {
  // GET /api/chat/contacts - list distinct users the authenticated user has exchanged messages with
  static async getContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contacts = await ChatService.getContacts(userId);
      res.json({ success: true, data: contacts });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/chat/messages/:contactId - paginated message history between two users
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contactId = req.params.contactId as string;
      
      const skip = parseInt(Array.isArray(req.query.skip) ? '0' : (req.query.skip as string) ?? '0', 10) || 0;
      const limit = parseInt(Array.isArray(req.query.limit) ? '50' : (req.query.limit as string) ?? '50', 10) || 50;

      const messages = await ChatService.getMessages(userId, contactId, skip, limit);
      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/chat/messages - send a message
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.userId;
      const { recipientId, text } = req.body;

      if (!recipientId || !text) {
        return res.status(400).json({ success: false, message: 'recipientId and text are required' });
      }

      const message = await ChatService.sendMessage(senderId, recipientId, text);
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/chat/messages/:contactId/read - mark messages as read
  static async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contactId = req.params.contactId as string;

      const result = await ChatService.markMessagesAsRead(userId, contactId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/chat/unread-count - get unread message count
  static async getUnreadMessageCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const count = await ChatService.getUnreadMessageCount(userId);
      res.json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  }
}

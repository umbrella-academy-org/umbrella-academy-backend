import { Request, Response, NextFunction } from 'express';
import { ChatService, ChatPermissionError } from '../services/chatService';

function handleChatError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ChatPermissionError) {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err instanceof Error && err.message === 'Message text is required.') {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

export class ChatController {
  static async getContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contacts = await ChatService.getContacts(userId);
      res.json({ success: true, data: contacts });
    } catch (err) {
      handleChatError(err, res, next);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contactId = req.params.contactId as string;

      const skip = parseInt(String(req.query.skip ?? '0'), 10) || 0;
      const limit = parseInt(String(req.query.limit ?? '50'), 10) || 50;

      const messages = await ChatService.getMessages(userId, contactId, skip, limit);
      res.json({ success: true, data: messages });
    } catch (err) {
      handleChatError(err, res, next);
    }
  }

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
      handleChatError(err, res, next);
    }
  }

  static async markMessagesAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contactId = req.params.contactId as string;

      const result = await ChatService.markMessagesAsRead(userId, contactId);
      res.json({ success: true, data: result });
    } catch (err) {
      handleChatError(err, res, next);
    }
  }

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

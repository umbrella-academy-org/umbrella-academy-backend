import { Request, Response, NextFunction } from 'express';
import { ChatService, ChatPermissionError } from '../services/chatService';
import type { MessageAttachment } from '../models/Message';

function handleChatError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ChatPermissionError) {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err instanceof Error && err.message === 'Message text or attachment is required.') {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

function serializeMessage(message: {
  _id: unknown;
  senderId: unknown;
  recipientId: unknown;
  text: string;
  attachment?: MessageAttachment | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return ChatService.formatMessage(message);
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
      res.json({
        success: true,
        data: messages.map((message) => serializeMessage(message)),
      });
    } catch (err) {
      handleChatError(err, res, next);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.userId;
      const { recipientId, text, attachment } = req.body;

      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'recipientId is required' });
      }

      if (!text?.trim() && !attachment) {
        return res.status(400).json({ success: false, message: 'text or attachment is required' });
      }

      const message = await ChatService.sendMessage(senderId, recipientId, text ?? '', attachment);
      res.status(201).json({
        success: true,
        data: serializeMessage({
          _id: message._id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          text: message.text,
          attachment: message.attachment ?? undefined,
          isRead: message.isRead,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        }),
      });
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

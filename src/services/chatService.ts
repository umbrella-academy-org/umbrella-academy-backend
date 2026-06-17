import { Types } from 'mongoose';
import Message, { MessageAttachment } from '../models/Message';
import {
  UserModel,
  StudentModel,
  TrainerModel,
  AdminModel,
  UserRole,
} from '../models/User';
import { TrainerService } from './trainerService';

export class ChatPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatPermissionError';
  }
}

export class ChatService {
  static normalizeId(id: unknown): string {
    if (id == null || id === '') return '';

    if (typeof id === 'string') return id;
    if (typeof id === 'number') return String(id);

    // Mongoose 9 ObjectId defines an `_id` getter that returns another ObjectId —
    // always stringify ObjectId instances before walking `_id`.
    if (id instanceof Types.ObjectId) {
      return id.toString();
    }

    if (typeof id === 'object') {
      const record = id as Record<string, unknown>;

      if (typeof record.toString === 'function') {
        const asString = (record as { toString: () => string }).toString();
        if (/^[a-f0-9]{24}$/i.test(asString)) {
          return asString;
        }
      }

      if (typeof record.$oid === 'string') {
        return record.$oid;
      }

      if (typeof record.id === 'string' || typeof record.id === 'number') {
        return String(record.id);
      }

      if (record._id != null && record._id !== id) {
        return this.normalizeId(record._id);
      }
    }

    return '';
  }

  static formatContact(user: {
    _id: unknown;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string | null;
  }) {
    return {
      _id: this.normalizeId(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePicture: user.profilePicture ?? undefined,
    };
  }

  static formatMessage(message: {
    _id: unknown;
    senderId: unknown;
    recipientId: unknown;
    text: string;
    attachment?: MessageAttachment | null;
    isRead: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }) {
    return {
      _id: this.normalizeId(message._id),
      senderId: this.normalizeId(message.senderId),
      recipientId: this.normalizeId(message.recipientId),
      text: message.text ?? '',
      attachment: message.attachment ?? undefined,
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  static getMessagePreview(message: { text?: string; attachment?: MessageAttachment | null }): string {
    if (message.text?.trim()) return message.text.trim();
    if (message.attachment) {
      if (message.attachment.mimeType.startsWith('image/')) return 'Photo';
      return `File: ${message.attachment.name}`;
    }
    return '';
  }

  static async getAllowedContactIds(userId: string): Promise<Set<string>> {
    const user = await UserModel.findById(userId).select('role');
    if (!user) return new Set();

    const allowed = new Set<string>();

    switch (user.role) {
      case UserRole.STUDENT: {
        const student = await StudentModel.findById(userId).select('assignedTrainerId');
        if (student?.assignedTrainerId) {
          allowed.add(this.normalizeId(student.assignedTrainerId));
        }
        const admins = await AdminModel.find({ isActive: true }).select('_id');
        admins.forEach((admin) => allowed.add(this.normalizeId(admin._id)));
        break;
      }
      case UserRole.TRAINER: {
        const studentIds = await TrainerService.getTrainerStudentIds(userId);
        studentIds.forEach((studentId) => allowed.add(studentId));
        const admins = await AdminModel.find({ isActive: true }).select('_id');
        admins.forEach((admin) => allowed.add(this.normalizeId(admin._id)));
        break;
      }
      case UserRole.ADMIN: {
        const [students, trainers] = await Promise.all([
          StudentModel.find({ isActive: true }).select('_id'),
          TrainerModel.find({ isActive: true, approvalStatus: 'approved' }).select('_id'),
        ]);
        students.forEach((student) => allowed.add(this.normalizeId(student._id)));
        trainers.forEach((trainer) => allowed.add(this.normalizeId(trainer._id)));
        break;
      }
      case UserRole.GUARDIAN: {
        const admins = await AdminModel.find({ isActive: true }).select('_id');
        admins.forEach((admin) => allowed.add(this.normalizeId(admin._id)));
        break;
      }
      default:
        break;
    }

    return allowed;
  }

  static async assertCanMessage(senderId: string, recipientId: string): Promise<void> {
    const normalizedSender = this.normalizeId(senderId);
    const normalizedRecipient = this.normalizeId(recipientId);

    if (!normalizedRecipient) {
      throw new ChatPermissionError('Recipient is required.');
    }

    if (normalizedSender === normalizedRecipient) {
      throw new ChatPermissionError('You cannot message yourself.');
    }

    const allowed = await this.getAllowedContactIds(normalizedSender);
    if (!allowed.has(normalizedRecipient)) {
      throw new ChatPermissionError('You are not allowed to message this user.');
    }
  }

  static async assertCanAccessConversation(userId: string, contactId: string): Promise<void> {
    await this.assertCanMessage(userId, contactId);
  }

  static async getContacts(userId: string) {
    const userObjId = new Types.ObjectId(userId);
    const allowedIds = await this.getAllowedContactIds(userId);

    const contacts = await Promise.all(
      Array.from(allowedIds).map(async (contactId) => {
        const contactObjId = new Types.ObjectId(contactId);

        const [contact, lastMessage, unreadCount] = await Promise.all([
          UserModel.findById(contactObjId)
            .select('firstName lastName role profilePicture')
            .lean(),
          Message.findOne({
            $or: [
              { senderId: userObjId, recipientId: contactObjId },
              { senderId: contactObjId, recipientId: userObjId },
            ],
          })
            .sort({ createdAt: -1 })
            .select('text attachment createdAt senderId recipientId isRead')
            .lean(),
          Message.countDocuments({
            senderId: contactObjId,
            recipientId: userObjId,
            isRead: false,
          }),
        ]);

        if (!contact) return null;

        return {
          contact: this.formatContact(contact),
          lastMessage: lastMessage ? this.formatMessage(lastMessage) : null,
          lastMessageAt: lastMessage?.createdAt ?? null,
          unreadCount,
        };
      })
    );

    return contacts
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      });
  }

  static async getMessages(userId: string, contactId: string, skip: number = 0, limit: number = 50) {
    await this.assertCanAccessConversation(userId, contactId);

    const userObjId = new Types.ObjectId(userId);
    const contactObjId = new Types.ObjectId(contactId);

    return Message.find({
      $or: [
        { senderId: userObjId, recipientId: contactObjId },
        { senderId: contactObjId, recipientId: userObjId },
      ],
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  static async sendMessage(
    senderId: string,
    recipientId: string,
    text: string,
    attachment?: MessageAttachment
  ) {
    const trimmed = text?.trim() ?? '';

    if (!trimmed && !attachment) {
      throw new Error('Message text or attachment is required.');
    }

    await this.assertCanMessage(senderId, recipientId);

    return Message.create({
      senderId: new Types.ObjectId(senderId),
      recipientId: new Types.ObjectId(recipientId),
      text: trimmed,
      attachment: attachment ?? undefined,
      isRead: false,
    });
  }

  static async markMessagesAsRead(userId: string, contactId: string) {
    await this.assertCanAccessConversation(userId, contactId);

    const userObjId = new Types.ObjectId(userId);
    const contactObjId = new Types.ObjectId(contactId);

    await Message.updateMany(
      {
        senderId: contactObjId,
        recipientId: userObjId,
        isRead: false,
      },
      { isRead: true }
    );

    return { success: true };
  }

  static async getUnreadMessageCount(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    return Message.countDocuments({
      recipientId: userObjId,
      isRead: false,
    });
  }
}

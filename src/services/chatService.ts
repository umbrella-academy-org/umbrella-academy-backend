import { Types } from 'mongoose';
import Message from '../models/Message';
import {
  UserModel,
  StudentModel,
  TrainerModel,
  AdminModel,
  UserRole,
} from '../models/User';

export class ChatPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatPermissionError';
  }
}

export class ChatService {
  static normalizeId(id: unknown): string {
    if (!id) return '';
    return String(id);
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
        const students = await StudentModel.find({ assignedTrainerId: userId }).select('_id');
        students.forEach((student) => allowed.add(this.normalizeId(student._id)));
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
          UserModel.findById(contactObjId).select('firstName lastName avatar role profilePicture'),
          Message.findOne({
            $or: [
              { senderId: userObjId, recipientId: contactObjId },
              { senderId: contactObjId, recipientId: userObjId },
            ],
          })
            .sort({ createdAt: -1 })
            .select('text createdAt senderId recipientId isRead'),
          Message.countDocuments({
            senderId: contactObjId,
            recipientId: userObjId,
            isRead: false,
          }),
        ]);

        if (!contact) return null;

        return {
          contact,
          lastMessage,
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
      .limit(limit);
  }

  static async sendMessage(senderId: string, recipientId: string, text: string) {
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new Error('Message text is required.');
    }

    await this.assertCanMessage(senderId, recipientId);

    return Message.create({
      senderId: new Types.ObjectId(senderId),
      recipientId: new Types.ObjectId(recipientId),
      text: trimmed,
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

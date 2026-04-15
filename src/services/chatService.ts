import { Types } from 'mongoose';
import Message from '../models/Message';
import { UserModel } from '../models/User';

export class ChatService {
  static async getContacts(userId: string) {
    const userObjId = new Types.ObjectId(userId);

    // Find all messages involving this user
    const messages = await Message.find({
      $or: [{ senderId: userObjId }, { recipientId: userObjId }],
    }).select('senderId recipientId');

    // Collect distinct contact IDs
    const contactIdSet = new Set<string>();
    for (const msg of messages) {
      const other = msg.senderId.equals(userObjId) ? msg.recipientId : msg.senderId;
      contactIdSet.add(other.toString());
    }

    // For each contact, get the last message
    const contacts = await Promise.all(
      Array.from(contactIdSet).map(async (contactId) => {
        const contactObjId = new Types.ObjectId(contactId);

        const [user, lastMessage] = await Promise.all([
          UserModel.findById(contactObjId).select('firstName lastName avatar role'),
          Message.findOne({
            $or: [
              { senderId: userObjId, recipientId: contactObjId },
              { senderId: contactObjId, recipientId: userObjId },
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

    return contacts;
  }

  static async getMessages(userId: string, contactId: string, skip: number = 0, limit: number = 50) {
    const userObjId = new Types.ObjectId(userId);
    const contactObjId = new Types.ObjectId(contactId);

    const messages = await Message.find({
      $or: [
        { senderId: userObjId, recipientId: contactObjId },
        { senderId: contactObjId, recipientId: userObjId },
      ],
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    return messages;
  }

  static async sendMessage(senderId: string, recipientId: string, text: string) {
    const senderObjId = new Types.ObjectId(senderId);
    const recipientObjId = new Types.ObjectId(recipientId);

    const message = await Message.create({
      senderId: senderObjId,
      recipientId: recipientObjId,
      text,
      createdAt: new Date(),
      isRead: false,
    });

    return message;
  }

  static async markMessagesAsRead(userId: string, contactId: string) {
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

    const count = await Message.countDocuments({
      recipientId: userObjId,
      isRead: false,
    });

    return count;
  }
}

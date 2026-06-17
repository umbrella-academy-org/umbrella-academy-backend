import { Schema, model, Document, Types } from 'mongoose';

export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface IMessage extends Document {
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  text: string;
  attachment?: MessageAttachment;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<MessageAttachment>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachment: { type: AttachmentSchema, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: 1 });

export default model<IMessage>('Message', MessageSchema);

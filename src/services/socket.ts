import http from 'http';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatService } from './chatService';

export const onlineUsers = new Map<string, string>();
export const notificationEmitter = new EventEmitter();

function getSocketOrigins(): string[] {
  const configured = process.env.FRONTEND_URL;
  const origins = ['http://localhost:3000', 'https://dreamize-academy.vercel.app'];
  if (configured && !origins.includes(configured)) {
    origins.push(configured);
  }
  return origins;
}

function serializeMessage(message: { toJSON?: () => Record<string, unknown> } & Record<string, unknown>) {
  const json = typeof message.toJSON === 'function' ? message.toJSON() : message;
  return {
    ...json,
    _id: ChatService.normalizeId(json._id),
    senderId: ChatService.normalizeId(json.senderId),
    recipientId: ChatService.normalizeId(json.recipientId),
  };
}

export function initSocket(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: getSocketOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication error: no token'));
    }
    try {
      const secret = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(token, secret) as {
        userId: string;
        role: string;
      };
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as { userId: string };
    onlineUsers.set(user.userId, socket.id);

    socket.on(
      'send_message',
      async (
        { recipientId, text }: { recipientId: string; text: string },
        callback?: (response: { success: boolean; message?: unknown; error?: string }) => void
      ) => {
        try {
          const message = await ChatService.sendMessage(user.userId, recipientId, text);
          const payload = { message: serializeMessage(message as any) };

          socket.emit('message_received', payload);

          const recipientSocketId = onlineUsers.get(ChatService.normalizeId(recipientId));
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message_received', payload);
          }

          callback?.({ success: true, message: payload.message });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
          socket.emit('error', { message: errorMessage });
          callback?.({ success: false, error: errorMessage });
        }
      }
    );

    socket.on('disconnect', () => {
      onlineUsers.delete(user.userId);
    });
  });

  notificationEmitter.on('notify', (userId: string, notification: unknown) => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('new_notification', { notification });
    }
  });

  return io;
}

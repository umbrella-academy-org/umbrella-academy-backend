import http from 'http';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message';

// In-memory map of userId → socketId
export const onlineUsers = new Map<string, string>();

// Shared emitter — route handlers call notificationEmitter.emit('notify', userId, notification)
// to push new_notification events to connected clients
export const notificationEmitter = new EventEmitter();

export function initSocket(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Auth middleware — verify handshake.auth.token before allowing connection
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
        fieldId?: string;
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

    // Handle send_message event
    socket.on(
      'send_message',
      async ({ recipientId, text }: { recipientId: string; text: string }) => {
        try {
          // Persist message to MongoDB
          const message = await Message.create({
            senderId: user.userId,
            recipientId,
            text,
          });

          // Confirm delivery to sender
          socket.emit('message_received', { message });

          // Emit to recipient if online
          const recipientSocketId = onlineUsers.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message_received', { message });
          }
        } catch {
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      onlineUsers.delete(user.userId);
    });
  });

  // Forward new_notification events from route handlers to connected clients
  notificationEmitter.on('notify', (userId: string, notification: unknown) => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('new_notification', { notification });
    }
  });

  return io;
}

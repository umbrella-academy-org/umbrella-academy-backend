import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Umbrella Academy API is running' });
});

// TODO (task 12.1): Mount route groups under /api
// app.use('/api/auth', authRoutes);
// app.use('/api/fields', fieldRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/roadmaps', roadmapRoutes);
// app.use('/api/sessions', sessionRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/wallet', walletRoutes);
// app.use('/api/stats', statsRoutes);
// app.use('/api/notifications', notificationRoutes);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// TODO (task socket.ts): initSocket(server) — Socket.io setup
// import { initSocket } from './services/socket';
// initSocket(server);

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

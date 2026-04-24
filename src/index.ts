import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db';
import { initSocket } from './services/socket';
import './seed/seedOwner';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import userRoutes from './routes/users';
import trainerRoutes from './routes/trainers';
import roadmapRoutes from './routes/roadmaps';
import chatRoutes from './routes/chat';
import statsRoutes from './routes/stats';
import systemRoutes from './routes/system';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import bookingRoutes from './routes/bookings';
import projectRoutes from './routes/projects'; // Importing projects route

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Dreamize API is running' });
});

// Mount route groups under /api
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/projects', projectRoutes); // Importing projects route

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

initSocket(server);

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

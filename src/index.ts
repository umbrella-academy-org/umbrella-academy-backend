import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import connectDB from './config/db';
import { initSocket } from './services/socket';
import './seed/seedOwner';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import fieldRoutes from './routes/fields';
import userRoutes from './routes/users';
import roadmapRoutes from './routes/roadmaps';
import sessionRoutes from './routes/sessions';
import chatRoutes from './routes/chat';
import paymentRoutes from './routes/payments';
import walletRoutes from './routes/wallet';
import statsRoutes from './routes/stats';
import notificationRoutes from './routes/notifications';
import systemRoutes from './routes/system';

import Field from './models/Field';
import Wallet from './models/Wallet';

Field.schema.post('save', async function (doc: any) {
  try {
    const exists = await Wallet.findOne({ ownerId: doc._id, ownerType: 'field' });
    if (!exists) {
      await Wallet.create({ ownerId: doc._id, ownerType: 'field', balance: 0, currency: 'RWF' });
    }
  } catch (err) {
    console.error('Failed to auto-create wallet for field:', err);
  }
});

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

// Mount route groups under /api (Requirement 11.6)
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);

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

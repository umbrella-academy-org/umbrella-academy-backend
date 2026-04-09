import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate, requireRole } from '../middleware/auth';
import Payment from '../models/Payment';
import Wallet from '../models/Wallet';
import Notification from '../models/Notification';

const router = Router();

// POST /api/payments — initiate a payment (student)
// Requirements: 6.1, 6.6
router.post(
  '/',
  authenticate,
  requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, fieldId, amount, phoneNumber, momoTransactionId } = req.body;

      const payment = await Payment.create({
        studentId,
        fieldId,
        amount,
        phoneNumber,
        momoTransactionId,
        status: 'pending',
        currency: 'RWF',
      });

      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/payments — list payments for the authenticated student
// Requirements: 6.5
router.get(
  '/',
  authenticate,
  requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await Payment.find({
        studentId: new Types.ObjectId(req.user!.userId),
      }).sort({ createdAt: -1 });

      res.json({ success: true, data: payments });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/payments/:id/confirm — confirm payment and distribute revenue (umbrella-admin)
// Requirements: 6.2, 6.3, 6.4, 10.4
router.put(
  '/:id/confirm',
  authenticate,
  requireRole('umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await Payment.findById(req.params.id);

      if (!payment) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
      }

      const { amount } = payment;
      const fieldShare = amount * 0.65;
      const academyShare = amount * 0.25;
      const processingFee = amount * 0.10;

      try {
        // Step 1: Update payment to completed
        payment.status = 'completed';
        payment.processedAt = new Date();
        payment.revenueDistribution = { fieldShare, academyShare, processingFee };
        await payment.save();

        // Step 2: Credit field wallet
        const fieldWallet = await Wallet.findOne({
          ownerId: payment.fieldId,
          ownerType: 'field',
        });

        if (!fieldWallet) {
          throw new Error('Field wallet not found');
        }

        fieldWallet.transactions.push({
          type: 'income',
          description: `Field share from payment ${payment._id}`,
          amount: fieldShare,
          currency: 'RWF',
          status: 'completed',
          reference: String(payment._id),
          createdAt: new Date(),
        });
        fieldWallet.balance += fieldShare;
        await fieldWallet.save();

        // Step 3: Credit umbrella wallet
        const umbrellaWallet = await Wallet.findOne({ ownerType: 'umbrella' });

        if (!umbrellaWallet) {
          throw new Error('Umbrella wallet not found');
        }

        umbrellaWallet.transactions.push({
          type: 'income',
          description: `Academy share from payment ${payment._id}`,
          amount: academyShare,
          currency: 'RWF',
          status: 'completed',
          reference: String(payment._id),
          createdAt: new Date(),
        });
        umbrellaWallet.balance += academyShare;
        await umbrellaWallet.save();

        // Step 4: Notify student
        await Notification.create({
          userId: payment.studentId,
          type: 'payment-completed',
          title: 'Payment Confirmed',
          message: 'Your payment has been confirmed and your enrollment is now active.',
          relatedId: payment._id,
        });

        res.json({ success: true, data: payment });
      } catch (innerErr) {
        // On any failure, mark payment as failed
        await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
        next(innerErr);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;

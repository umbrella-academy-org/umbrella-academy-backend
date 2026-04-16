import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { PaymentType } from '../models/Payment';

export class PaymentController {
  // POST /payments/orIENTATION - initiate orientation payment
  static async initiateOrientationPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { promoCode } = req.body as { promoCode?: string };

      const result = await PaymentService.createOrientationPayment(userId, promoCode);

      res.status(201).json({
        success: true,
        data: {
          paymentId: result.payment.id,
          transactionRef: result.payment.transactionRef,
          amount: result.amount,
          originalAmount: result.originalAmount,
          discountApplied: result.discountApplied,
          paymentUrl: result.paymentUrl,
          type: PaymentType.ORIENTATION
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Only students can make orientation payments') {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message === 'Orientation payment already completed') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Invalid or expired promo code') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /payments/subscription - initiate subscription payment
  static async initiateSubscriptionPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { promoCode } = req.body as { promoCode?: string };

      const result = await PaymentService.createSubscriptionPayment(userId, promoCode);

      res.status(201).json({
        success: true,
        data: {
          paymentId: result.payment.id,
          transactionRef: result.payment.transactionRef,
          amount: result.amount,
          originalAmount: result.originalAmount,
          discountApplied: result.discountApplied,
          paymentUrl: result.paymentUrl,
          type: PaymentType.SUBSCRIPTION
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'User not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Only students can make subscription payments') {
          return res.status(403).json({ success: false, message: err.message });
        }
        if (err.message === 'Orientation payment must be completed before subscription') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Invalid or expired promo code') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /payments/confirm - confirm payment (webhook endpoint)
  static async confirmPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionRef } = req.body as { transactionRef: string };

      if (!transactionRef) {
        return res.status(400).json({ success: false, message: 'Transaction reference is required' });
      }

      const payment = await PaymentService.confirmPayment(transactionRef);

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          transactionRef: payment.transactionRef,
          status: payment.status,
          type: payment.type,
          amount: payment.finalAmount
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Payment not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Payment already confirmed') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /payments/status - get payment status for current user
  static async getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type } = req.query as { type?: PaymentType };

      const payments = await PaymentService.getPaymentStatus(userId, type);

      res.json({
        success: true,
        data: payments
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /payments/subscription - get subscription status for current user
  static async getSubscriptionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const subscription = await PaymentService.getSubscriptionStatus(userId);

      if (!subscription) {
        return res.json({
          success: true,
          data: {
            hasSubscription: false,
            message: 'No subscription found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          hasSubscription: true,
          subscription: {
            id: subscription.id,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            isActive: subscription.isActive,
            daysRemaining: subscription.daysRemaining,
            colorCode: subscription.colorCode
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /payments/history - get payment history for current user
  static async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const payments = await PaymentService.getPaymentHistory(userId);

      res.json({
        success: true,
        data: payments
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /payments/admin/payments - get all payments (admin only)
  static async getAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, type, status } = req.query as {
        studentId?: string;
        type?: PaymentType;
        status?: string;
      };

      // Build filter
      const filter: any = {};
      if (studentId) filter.studentId = studentId;
      if (type) filter.type = type;
      if (status) filter.status = status;

      const payments = await PaymentService.getPaymentStatus('', type);

      res.json({
        success: true,
        data: payments
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /payments/admin/subscriptions - get all subscriptions (admin only)
  static async getAllSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.query as { studentId?: string };

      // This would need to be implemented in the service
      // For now, return a placeholder response
      res.json({
        success: true,
        data: [],
        message: 'Admin subscription management endpoint'
      });
    } catch (err) {
      next(err);
    }
  }
}

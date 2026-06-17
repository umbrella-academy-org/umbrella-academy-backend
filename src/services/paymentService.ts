import { PaymentModel, SubscriptionModel, PromoCodeModel } from '../models/Payment';
import { PaymentType, SubscriptionColor, Payment, Subscription, PromoCode } from '../models/Payment';
import { UserModel } from '../models/User';

export class PaymentService {
  // Payment amounts in RWF
  private static readonly ORIENTATION_FEE = 20000;
  private static readonly SUBSCRIPTION_FEE = 100000;

  static async createOrientationPayment(studentId: string, promoCode?: string) {
    // Check if user exists and is a student
    const user = await UserModel.findById(studentId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'student') {
      throw new Error('Only students can make orientation payments');
    }

    // Check if orientation payment already exists and is successful
    const existingOrientationPayment = await PaymentModel.findOne({
      studentId,
      type: PaymentType.ORIENTATION,
      status: 'success'
    });
    if (existingOrientationPayment) {
      throw new Error('Orientation payment already completed');
    }

    let finalAmount = this.ORIENTATION_FEE;
    let promoCodeApplied: string | undefined;

    // Apply promo code if provided
    if (promoCode) {
      const promo = await this.validatePromoCode(promoCode, studentId);
      if (promo) {
        finalAmount = finalAmount - promo.discountAmount;
        promoCodeApplied = promo.code;
      }
    }

    const transactionRef = this.generateTransactionRef();
    const paymentId = this.generatePaymentId();

    const discountAmount = promoCodeApplied ? this.ORIENTATION_FEE - finalAmount : 0;

    const payment = await PaymentModel.create({
      id: paymentId,
      student: studentId,
      type: PaymentType.ORIENTATION,
      amount: this.ORIENTATION_FEE,
      promoCodeApplied,
      discountAmount,
      finalAmount,
      transactionRef,
      status: 'success',
      paidAt: new Date()
    });

    // Mark promo code as used if applied
    if (promoCodeApplied) {
      await this.markPromoCodeAsUsed(promoCodeApplied, studentId);
    }

    await user.updateOne({ $set: { hasPaidOrientation: true } });


    return {
      payment,
      amount: finalAmount,
      originalAmount: this.ORIENTATION_FEE,
      discountApplied: discountAmount
    };
  }

  static async createSubscriptionPayment(studentId: string, promoCode?: string) {
    // Check if user exists and is a student
    const user = await UserModel.findById(studentId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'student') {
      throw new Error('Only students can make subscription payments');
    }

    // Check if orientation payment is completed
    const orientationPayment = await PaymentModel.findOne({
      studentId,
      type: PaymentType.ORIENTATION,
      status: 'success'
    });
    if (!orientationPayment) {
      throw new Error('Orientation payment must be completed before subscription');
    }

    let finalAmount = this.SUBSCRIPTION_FEE;
    let promoCodeApplied: string | undefined;

    // Apply promo code if provided
    if (promoCode) {
      const promo = await this.validatePromoCode(promoCode, studentId);
      if (promo) {
        finalAmount = finalAmount - promo.discountAmount;
        promoCodeApplied = promo.code;
      }
    }

    const transactionRef = this.generateTransactionRef();
    const paymentId = this.generatePaymentId();

    const discountAmount = promoCodeApplied ? this.SUBSCRIPTION_FEE - finalAmount : 0;

    const payment = await PaymentModel.create({
      id: paymentId,
      student: studentId,
      type: PaymentType.SUBSCRIPTION,
      amount: this.SUBSCRIPTION_FEE,
      promoCodeApplied,
      discountAmount,
      finalAmount,
      transactionRef,
      status: 'success',
      paidAt: new Date()
    });

    // Mark promo code as used if applied
    if (promoCodeApplied) {
      await this.markPromoCodeAsUsed(promoCodeApplied, studentId);
    }

    // Create subscription record
    await this.createOrUpdateSubscription(studentId);

    const { SubscriptionMaintenanceService } = await import('./subscriptionMaintenanceService');
    await SubscriptionMaintenanceService.syncStudentSubscription(studentId);

    try {
      const { SalesLeadService } = await import('./salesLeadService');
      await SalesLeadService.markSubscribed(studentId);
    } catch (error) {
      console.warn('Failed to update sales lead for subscription:', error);
    }

    return {
      payment,
      amount: finalAmount,
      originalAmount: this.SUBSCRIPTION_FEE,
      discountApplied: discountAmount
    };
  }

  static async confirmPayment(transactionRef: string) {
    const payment = await PaymentModel.findOne({ transactionRef });
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'success') {
      throw new Error('Payment already confirmed');
    }

    // Update payment status
    payment.status = 'success';
    await payment.save();

    // If it's a subscription payment, create/update subscription
    if (payment.type === PaymentType.SUBSCRIPTION) {
      await this.createOrUpdateSubscription(payment.student);
      try {
        const { SalesLeadService } = await import('./salesLeadService');
        await SalesLeadService.markSubscribed(String(payment.student));
      } catch (error) {
        console.warn('Failed to update sales lead for subscription:', error);
      }
    }

    return payment;
  }

  static async getPaymentStatus(studentId: string, paymentType?: PaymentType) {

    const filter: any = {};
    if (studentId) filter.studentId = studentId;
    if (paymentType) filter.type = paymentType;

    const payments = await PaymentModel.find(filter).sort({ createdAt: -1 });
    return payments;
  }

  static async getPaymentStatusWithFilter(filter: any) {
    const payments = await PaymentModel
      .find(filter)
      .populate('student', 'name email')
      .sort({ createdAt: -1 });
    return payments;
  }

  static async getSubscriptionStatus(studentId: string) {
    const { SubscriptionMaintenanceService } = await import('./subscriptionMaintenanceService');
    return SubscriptionMaintenanceService.syncStudentSubscription(studentId);
  }

  private static async validatePromoCode(code: string, studentId: string): Promise<PromoCode | null> {
    const promo = await PromoCodeModel.findOne({
      code: code.toUpperCase(),
      assignedStudentId: studentId,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!promo) {
      throw new Error('Invalid or expired promo code');
    }

    return promo;
  }

  private static async markPromoCodeAsUsed(code: string, studentId: string): Promise<void> {
    const promo = await PromoCodeModel.findOne({
      code: code.toUpperCase(),
      assignedStudentId: studentId,
      isUsed: false
    });

    if (!promo) {
      return; // Silently return if promo code not found or already used
    }

    promo.isUsed = true;
    promo.usedAt = new Date();
    await promo.save();
  }

  private static async createOrUpdateSubscription(studentId: string) {
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // Add 1 month

    const existingSubscription = await SubscriptionModel.findOne({ student: studentId });

    if (existingSubscription) {
      // Extend existing subscription
      existingSubscription.startDate = startDate;
      existingSubscription.expiryDate = expiryDate;
      existingSubscription.isActive = true;
      existingSubscription.daysRemaining = 30;
      existingSubscription.colorCode = SubscriptionColor.GREEN;
      existingSubscription.lastReminderSent = {
        sevenDay: false,
        twoDay: false,
        expired: false
      };
      await existingSubscription.save();
    } else {
      // Create new subscription
      const subscriptionId = this.generateSubscriptionId();
      await SubscriptionModel.create({
        id: subscriptionId,
        student: studentId,
        startDate,
        expiryDate,
        isActive: true,
        autoRenew: false,
        daysRemaining: 30,
        colorCode: SubscriptionColor.GREEN,
        lastReminderSent: {
          sevenDay: false,
          twoDay: false,
          expired: false
        }
      });
    }
  }

  private static getSubscriptionColor(daysRemaining: number): SubscriptionColor {
    if (daysRemaining > 20) return SubscriptionColor.GREEN;
    if (daysRemaining >= 7) return SubscriptionColor.YELLOW;
    if (daysRemaining > 0) return SubscriptionColor.RED;
    return SubscriptionColor.GRAY;
  }

  private static generatePaymentId(): string {
    return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateSubscriptionId(): string {
    return `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateTransactionRef(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  static async getPaymentHistory(studentId: string) {
    const payments = await PaymentModel.find({ student: studentId })
      .sort({ createdAt: -1 })
      .select('-__v');

    return payments;
  }
}

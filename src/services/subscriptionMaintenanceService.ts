import { SubscriptionModel, SubscriptionColor } from '../models/Payment';
import { StudentModel } from '../models/User';
import { NotificationService } from './notificationService';
import { queueEmail } from './emailService';

export class SubscriptionMaintenanceService {
  static getSubscriptionColor(daysRemaining: number): SubscriptionColor {
    if (daysRemaining > 20) return SubscriptionColor.GREEN;
    if (daysRemaining >= 7) return SubscriptionColor.YELLOW;
    if (daysRemaining > 0) return SubscriptionColor.RED;
    return SubscriptionColor.GRAY;
  }

  static async syncStudentSubscription(studentId: string) {
    const subscription = await SubscriptionModel.findOne({ student: studentId });
    if (!subscription) {
      await StudentModel.findByIdAndUpdate(studentId, {
        hasActiveSubscription: false,
        subscriptionExpiryDate: null,
      });
      return null;
    }

    const now = new Date();
    const expiryDate = new Date(subscription.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isActive = daysRemaining > 0;

    subscription.daysRemaining = Math.max(0, daysRemaining);
    subscription.colorCode = this.getSubscriptionColor(daysRemaining);
    subscription.isActive = isActive;
    await subscription.save();

    await StudentModel.findByIdAndUpdate(studentId, {
      hasActiveSubscription: isActive,
      subscriptionExpiryDate: expiryDate,
    });

    await this.sendRemindersIfNeeded(studentId, subscription, daysRemaining, isActive);

    return subscription;
  }

  private static async sendRemindersIfNeeded(
    studentId: string,
    subscription: {
      lastReminderSent: { sevenDay: boolean; twoDay: boolean; expired: boolean };
      save: () => Promise<unknown>;
    },
    daysRemaining: number,
    isActive: boolean
  ) {
    const student = await StudentModel.findById(studentId).select('firstName lastName email');
    if (!student) return;

    const studentName = `${student.firstName} ${student.lastName}`.trim() || 'Student';
    let reminderType: 'sevenDay' | 'twoDay' | 'expired' | null = null;
    let title = '';
    let message = '';

    if (isActive && daysRemaining <= 7 && daysRemaining > 2 && !subscription.lastReminderSent.sevenDay) {
      reminderType = 'sevenDay';
      title = 'Subscription renewing soon';
      message = `Your mentorship subscription expires in ${daysRemaining} days. Renew to keep full access.`;
    } else if (isActive && daysRemaining <= 2 && daysRemaining > 0 && !subscription.lastReminderSent.twoDay) {
      reminderType = 'twoDay';
      title = 'Subscription expires in 2 days';
      message = `Your mentorship access ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now to avoid interruption.`;
    } else if (!isActive && !subscription.lastReminderSent.expired) {
      reminderType = 'expired';
      title = 'Subscription expired';
      message = 'Your mentorship subscription has expired. Renew to restore access to learning features.';
    }

    if (!reminderType) return;

    try {
      await NotificationService.create({
        userId: studentId,
        title,
        message,
        category: 'system',
        actionUrl: '/dashboard/student/subscription',
      });
    } catch (error) {
      console.warn('Failed to create subscription reminder notification:', error);
    }

    if (student.email) {
      queueEmail({
        to_email: student.email,
        to_name: studentName,
        subject: title,
        message: `${message}\n\nVisit your subscription page to renew: ${process.env.FRONTEND_URL}/dashboard/student/subscription`,
      });
    }

    subscription.lastReminderSent[reminderType] = true;
    await subscription.save();
  }

  static async processAllSubscriptions() {
    const subscriptions = await SubscriptionModel.find({}).select('student');
    const studentIds = [...new Set(subscriptions.map((item) => String(item.student)))];

    for (const studentId of studentIds) {
      try {
        await this.syncStudentSubscription(studentId);
      } catch (error) {
        console.warn(`Failed to sync subscription for ${studentId}:`, error);
      }
    }
  }
}

export function startSubscriptionMaintenanceScheduler() {
  const run = () => {
    SubscriptionMaintenanceService.processAllSubscriptions().catch((error) => {
      console.warn('Subscription maintenance run failed:', error);
    });
  };

  run();
  const intervalMs = 6 * 60 * 60 * 1000;
  return setInterval(run, intervalMs);
}

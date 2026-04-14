import { Schema, model, Document, Types } from 'mongoose';

export interface IRevenueDistribution {
  academyShare?: number;
  processingFee?: number;
}


export enum PaymentType {
  ORIENTATION = 'orientation',
  SUBSCRIPTION = 'subscription'
}

export enum SubscriptionColor {
  GREEN = 'green',   // 20+ days
  YELLOW = 'yellow', // 7-19 days
  RED = 'red',       // 0-6 days
  GRAY = 'gray'      // expired
}

export interface Subscription {
  id: string;
  studentId: string;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  autoRenew: boolean;
  daysRemaining: number; // Calculated field
  colorCode: SubscriptionColor;
  lastReminderSent: {
    sevenDay: boolean;
    twoDay: boolean;
    expired: boolean;
  };
}

export interface PromoCode {
  code: string;
  assignedStudentEmail: string; 
  assignedStudentId: string;
  discountAmount: number;      
  discountPercentage: number;  
  isUsed: boolean;
  usedAt: Date | null;
  reason: string;              // Admin must record reason
  createdByAdminId: string;
  expiresAt: Date;
}

export interface Payment {
  id: string;
  studentId: string;
  type: PaymentType;
  amount: number; // 20,000 or 100,000 RWF
  promoCodeApplied?: string;
  finalAmount: number;
  transactionRef: string;
  status: 'pending' | 'success' | 'failed';
  paidAt: Date;
}

export interface IPayment extends Document {
  studentId: Types.ObjectId;
  amount: number;
  currency: string;
  phoneNumber: string;
  momoTransactionId: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: Date;
  revenueDistribution?: IRevenueDistribution;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'RWF' },
    phoneNumber: { type: String, required: true },
    momoTransactionId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    processedAt: { type: Date },
    revenueDistribution: {
      academyShare: { type: Number },
      processingFee: { type: Number },
    },
  },
  { timestamps: true }
);

export default model<IPayment>('Payment', PaymentSchema);

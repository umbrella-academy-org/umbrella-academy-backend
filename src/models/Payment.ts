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

export interface Subscription extends Document {
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

export interface PromoCode extends Document {
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

export interface Payment extends Document {
  id: string;
  studentId: string;
  type: PaymentType;
  amount: number; // 20,000 or 100,000 RWF
  promoCodeApplied?: string;
  discountAmount: number; // Amount discounted
  finalAmount: number;
  transactionRef: string;
  status: 'pending' | 'success' | 'failed';
  paidAt: Date;
}

// Schemas
const LastReminderSentSchema = new Schema({
  sevenDay: { type: Boolean, default: false },
  twoDay: { type: Boolean, default: false },
  expired: { type: Boolean, default: false }
});

const SubscriptionSchema = new Schema<Subscription>({
  id: { type: String, required: true },
  studentId: { type: String, required: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, required: true },
  autoRenew: { type: Boolean, required: true },
  daysRemaining: { type: Number, required: true },
  colorCode: { 
    type: String, 
    enum: Object.values(SubscriptionColor), 
    required: true 
  },
  lastReminderSent: { type: LastReminderSentSchema, default: () => ({}) }
});

const PromoCodeSchema = new Schema<PromoCode>({
  code: { type: String, required: true, unique: true },
  assignedStudentEmail: { type: String, required: true },
  assignedStudentId: { type: String, required: true },
  discountAmount: { type: Number, required: true },
  discountPercentage: { type: Number, required: true },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date, default: null },
  reason: { type: String, required: true },
  createdByAdminId: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const PaymentSchema = new Schema<Payment>({
  id: { type: String, required: true },
  studentId: { type: String, required: true },
  type: { 
    type: String, 
    enum: Object.values(PaymentType), 
    required: true 
  },
  amount: { type: Number, required: true },
  promoCodeApplied: { type: String, default: undefined },
  discountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  transactionRef: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed'], 
    required: true 
  },
  paidAt: { type: Date, required: true }
});

// Models
export const SubscriptionModel = model<Subscription>('Subscription', SubscriptionSchema);
export const PromoCodeModel = model<PromoCode>('PromoCode', PromoCodeSchema);
export const PaymentModel = model<Payment>('Payment', PaymentSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface IRevenueDistribution {
  fieldShare?: number;
  academyShare?: number;
  processingFee?: number;
}

export interface IPayment extends Document {
  studentId: Types.ObjectId;
  fieldId: Types.ObjectId;
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
    fieldId: { type: Schema.Types.ObjectId, ref: 'Field', required: true },
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
      fieldShare: { type: Number },
      academyShare: { type: Number },
      processingFee: { type: Number },
    },
  },
  { timestamps: true }
);

export default model<IPayment>('Payment', PaymentSchema);

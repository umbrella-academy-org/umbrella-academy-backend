import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction {
  type: 'income' | 'withdrawal' | 'payment';
  description?: string;
  amount?: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  createdAt: Date;
}

export interface IWallet extends Document {
  ownerId: Types.ObjectId;
  ownerType: 'trainer' | 'field' | 'umbrella';
  balance: number;
  currency: string;
  transactions: ITransaction[];
}

const TransactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ['income', 'withdrawal', 'payment'] },
    description: { type: String },
    amount: { type: Number },
    currency: { type: String, default: 'RWF' },
    status: { type: String, enum: ['pending', 'completed', 'failed'] },
    reference: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WalletSchema = new Schema<IWallet>(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    ownerType: { type: String, enum: ['trainer', 'field', 'umbrella'] },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'RWF' },
    transactions: { type: [TransactionSchema], default: [] },
  },
  { timestamps: true }
);

export default model<IWallet>('Wallet', WalletSchema);

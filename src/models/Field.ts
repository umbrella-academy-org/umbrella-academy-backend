import { Schema, model, Document } from 'mongoose';

export type FieldSlug =
  | 'software-engineering'
  | 'media-production-and-storytelling'
  | 'ai-intelligence'
  | 'cyber-resilience';

export interface IField extends Document {
  name: string;
  slug: FieldSlug;
  description?: string;
  icon?: string;
  monthlyPrice: number;
  specializations: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fieldSchema = new Schema<IField>(
  {
    name: { type: String, required: true, unique: true },
    slug: {
      type: String,
      enum: [
        'software-engineering',
        'media-production-and-storytelling',
        'ai-intelligence',
        'cyber-resilience',
      ],
    },
    description: { type: String },
    icon: { type: String },
    monthlyPrice: { type: Number, required: true },
    specializations: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<IField>('Field', fieldSchema);

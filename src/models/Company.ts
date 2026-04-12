import { Schema, model, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  fields: string[]; // field slugs/ids this company offers
  mentorId?: Types.ObjectId; // assigned mentor
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    website: { type: String },
    logo: { type: String },
    fields: [{ type: String }],
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model<ICompany>('Company', companySchema);

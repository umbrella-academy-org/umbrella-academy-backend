import { PromoCodeModel, PromoCode } from '../models/Payment';
import { UserModel } from '../models/User';

export interface CreatePromoCodeData {
  code: string;
  assignedStudentEmail: string;
  discountAmount: number;
  discountPercentage: number;
  reason: string;
  expiresAt: Date;
}

export interface UpdatePromoCodeData {
  assignedStudentEmail?: string;
  discountAmount?: number;
  discountPercentage?: number;
  reason?: string;
  expiresAt?: Date;
}

export class PromoCodeService {
  // Create a new promo code
  static async createPromoCode(data: CreatePromoCodeData, adminId: string): Promise<PromoCode> {
    // Check if promo code already exists
    const existingCode = await PromoCodeModel.findOne({ code: data.code });
    if (existingCode) {
      throw new Error('Promo code already exists');
    }

    // Find student by email
    const student = await UserModel.findOne({ 
      email: data.assignedStudentEmail,
      role: 'student'
    });

    if (!student) {
      throw new Error('Student not found with this email');
    }

    // Create promo code
    const promoCode = new PromoCodeModel({
      code: data.code,
      assignedStudentEmail: data.assignedStudentEmail,
      assignedStudentId: student._id.toString(),
      discountAmount: data.discountAmount,
      discountPercentage: data.discountPercentage,
      isUsed: false,
      usedAt: null,
      reason: data.reason,
      createdByAdminId: adminId,
      expiresAt: data.expiresAt
    });

    await promoCode.save();
    return promoCode;
  }

  // Get all promo codes with optional filters
  static async getAllPromoCodes(filters?: {
    isUsed?: boolean;
    studentEmail?: string;
    createdByAdminId?: string;
  }): Promise<PromoCode[]> {
    const query: any = {};

    if (filters?.isUsed !== undefined) {
      query.isUsed = filters.isUsed;
    }

    if (filters?.studentEmail) {
      query.assignedStudentEmail = { $regex: filters.studentEmail, $options: 'i' };
    }

    if (filters?.createdByAdminId) {
      query.createdByAdminId = filters.createdByAdminId;
    }

    const promoCodes = await PromoCodeModel.find(query)
      .sort({ createdAt: -1 });

    return promoCodes;
  }

  // Get a single promo code by code
  static async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const promoCode = await PromoCodeModel.findOne({ code });
    return promoCode;
  }

  // Update a promo code (only if not used)
  static async updatePromoCode(code: string, data: UpdatePromoCodeData): Promise<PromoCode | null> {
    const promoCode = await PromoCodeModel.findOne({ code });

    if (!promoCode) {
      throw new Error('Promo code not found');
    }

    if (promoCode.isUsed) {
      throw new Error('Cannot update a used promo code');
    }

    // If email is being updated, verify the new student exists
    if (data.assignedStudentEmail && data.assignedStudentEmail !== promoCode.assignedStudentEmail) {
      const student = await UserModel.findOne({ 
        email: data.assignedStudentEmail,
        role: 'student'
      });

      if (!student) {
        throw new Error('Student not found with this email');
      }

      promoCode.assignedStudentId = student._id.toString();
      promoCode.assignedStudentEmail = data.assignedStudentEmail;
    }

    // Update other fields
    if (data.discountAmount !== undefined) {
      promoCode.discountAmount = data.discountAmount;
    }

    if (data.discountPercentage !== undefined) {
      promoCode.discountPercentage = data.discountPercentage;
    }

    if (data.reason !== undefined) {
      promoCode.reason = data.reason;
    }

    if (data.expiresAt !== undefined) {
      promoCode.expiresAt = data.expiresAt;
    }

    await promoCode.save();
    return promoCode;
  }

  // Delete a promo code (only if not used)
  static async deletePromoCode(code: string): Promise<void> {
    const promoCode = await PromoCodeModel.findOne({ code });

    if (!promoCode) {
      throw new Error('Promo code not found');
    }

    if (promoCode.isUsed) {
      throw new Error('Cannot delete a used promo code');
    }

    await PromoCodeModel.deleteOne({ code });
  }

  // Mark promo code as used
  static async markPromoCodeAsUsed(code: string): Promise<PromoCode | null> {
    const promoCode = await PromoCodeModel.findOne({ code });

    if (!promoCode) {
      throw new Error('Promo code not found');
    }

    if (promoCode.isUsed) {
      throw new Error('Promo code has already been used');
    }

    if (promoCode.expiresAt < new Date()) {
      throw new Error('Promo code has expired');
    }

    promoCode.isUsed = true;
    promoCode.usedAt = new Date();
    await promoCode.save();

    return promoCode;
  }

  // Validate promo code for a student
  static async validatePromoCode(code: string, studentId: string): Promise<{
    valid: boolean;
    promoCode?: PromoCode;
    message?: string;
  }> {
    const promoCode = await PromoCodeModel.findOne({ code });

    if (!promoCode) {
      return { valid: false, message: 'Invalid promo code' };
    }

    if (promoCode.isUsed) {
      return { valid: false, message: 'Promo code has already been used' };
    }

    if (promoCode.expiresAt < new Date()) {
      return { valid: false, message: 'Promo code has expired' };
    }

    if (promoCode.assignedStudentId !== studentId) {
      return { valid: false, message: 'Promo code is not assigned to this student' };
    }

    return { valid: true, promoCode };
  }

  // Get promo code statistics
  static async getPromoCodeStats(): Promise<{
    total: number;
    used: number;
    unused: number;
    expired: number;
  }> {
    const now = new Date();

    const [total, used, unused, expired] = await Promise.all([
      PromoCodeModel.countDocuments(),
      PromoCodeModel.countDocuments({ isUsed: true }),
      PromoCodeModel.countDocuments({ isUsed: false, expiresAt: { $gt: now } }),
      PromoCodeModel.countDocuments({ isUsed: false, expiresAt: { $lte: now } })
    ]);

    return {
      total,
      used,
      unused,
      expired
    };
  }
}

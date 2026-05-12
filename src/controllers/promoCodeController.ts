import { Request, Response, NextFunction } from 'express';
import { PromoCodeService } from '../services/promoCodeService';

export class PromoCodeController {
  // POST /api/admin/promo-codes - Create a new promo code
  static async createPromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.userId;
      const { code, assignedStudentEmail, discountAmount, discountPercentage, reason, expiresAt } = req.body;

      // Validate required fields
      if (!code || !assignedStudentEmail || discountAmount === undefined || discountPercentage === undefined || !reason || !expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: code, assignedStudentEmail, discountAmount, discountPercentage, reason, expiresAt'
        });
      }

      // Validate discount values
      if (discountAmount < 0 || discountPercentage < 0 || discountPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount values. Amount must be >= 0 and percentage must be between 0 and 100'
        });
      }

      const promoCode = await PromoCodeService.createPromoCode({
        code: code.toUpperCase().trim(),
        assignedStudentEmail: assignedStudentEmail.toLowerCase().trim(),
        discountAmount: Number(discountAmount),
        discountPercentage: Number(discountPercentage),
        reason: reason.trim(),
        expiresAt: new Date(expiresAt)
      }, adminId);

      res.status(201).json({
        success: true,
        data: promoCode,
        message: 'Promo code created successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Promo code already exists') {
          return res.status(409).json({ success: false, message: err.message });
        }
        if (err.message === 'Student not found with this email') {
          return res.status(404).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /api/admin/promo-codes - Get all promo codes with optional filters
  static async getAllPromoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { isUsed, studentEmail, createdByAdminId } = req.query;

      const filters: {
        isUsed?: boolean;
        studentEmail?: string;
        createdByAdminId?: string;
      } = {};

      if (isUsed !== undefined) {
        filters.isUsed = isUsed === 'true';
      }

      if (studentEmail) {
        filters.studentEmail = studentEmail as string;
      }

      if (createdByAdminId) {
        filters.createdByAdminId = createdByAdminId as string;
      }

      const promoCodes = await PromoCodeService.getAllPromoCodes(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.json({
        success: true,
        data: promoCodes,
        count: promoCodes.length
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/promo-codes/:code - Get a single promo code by code
  static async getPromoCodeByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.params.code === 'string' ? req.params.code : req.params.code[0];

      const promoCode = await PromoCodeService.getPromoCodeByCode(code.toUpperCase());

      if (!promoCode) {
        return res.status(404).json({
          success: false,
          message: 'Promo code not found'
        });
      }

      res.json({
        success: true,
        data: promoCode
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/admin/promo-codes/:code - Update a promo code
  static async updatePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.params.code === 'string' ? req.params.code : req.params.code[0];
      const { assignedStudentEmail, discountAmount, discountPercentage, reason, expiresAt } = req.body;

      // Validate discount values if provided
      if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount percentage. Must be between 0 and 100'
        });
      }

      if (discountAmount !== undefined && discountAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount amount. Must be >= 0'
        });
      }

      const updateData: {
        assignedStudentEmail?: string;
        discountAmount?: number;
        discountPercentage?: number;
        reason?: string;
        expiresAt?: Date;
      } = {};

      if (assignedStudentEmail !== undefined) {
        updateData.assignedStudentEmail = assignedStudentEmail.toLowerCase().trim();
      }

      if (discountAmount !== undefined) {
        updateData.discountAmount = Number(discountAmount);
      }

      if (discountPercentage !== undefined) {
        updateData.discountPercentage = Number(discountPercentage);
      }

      if (reason !== undefined) {
        updateData.reason = reason.trim();
      }

      if (expiresAt !== undefined) {
        updateData.expiresAt = new Date(expiresAt);
      }

      const promoCode = await PromoCodeService.updatePromoCode(code.toUpperCase(), updateData);

      res.json({
        success: true,
        data: promoCode,
        message: 'Promo code updated successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Promo code not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Cannot update a used promo code') {
          return res.status(400).json({ success: false, message: err.message });
        }
        if (err.message === 'Student not found with this email') {
          return res.status(404).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // DELETE /api/admin/promo-codes/:code - Delete a promo code
  static async deletePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.params.code === 'string' ? req.params.code : req.params.code[0];

      await PromoCodeService.deletePromoCode(code.toUpperCase());

      res.json({
        success: true,
        message: 'Promo code deleted successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Promo code not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Cannot delete a used promo code') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /api/admin/promo-codes/stats - Get promo code statistics
  static async getPromoCodeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await PromoCodeService.getPromoCodeStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/promo-codes/validate - Validate a promo code (for students)
  static async validatePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const studentId = req.user!.userId;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Promo code is required'
        });
      }

      const result = await PromoCodeService.validatePromoCode(code.toUpperCase().trim(), studentId);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: result.promoCode,
        message: 'Promo code is valid'
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/promo-codes/apply - Apply a promo code (mark as used)
  static async applyPromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Promo code is required'
        });
      }

      const promoCode = await PromoCodeService.markPromoCodeAsUsed(code.toUpperCase().trim());

      res.json({
        success: true,
        data: promoCode,
        message: 'Promo code applied successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Promo code not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Promo code has already been used' || err.message === 'Promo code has expired') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }
}

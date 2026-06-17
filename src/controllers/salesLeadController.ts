import { Request, Response, NextFunction } from 'express';
import { LeadStatus } from '../models/Dashboard';
import { SalesLeadService } from '../services/salesLeadService';

export class SalesLeadController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SalesLeadService.getDashboardData();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as LeadStatus | undefined;
      const search = req.query.search as string | undefined;
      const leads = await SalesLeadService.getLeads({ status, search });
      res.json({ success: true, data: leads });
    } catch (err) {
      next(err);
    }
  }

  static async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const leadId = req.params.id as string;
      const { status, notes, markContacted } = req.body as {
        status?: LeadStatus;
        notes?: string;
        markContacted?: boolean;
      };

      const lead = await SalesLeadService.updateLead(leadId, { status, notes, markContacted });
      res.json({ success: true, data: lead, message: 'Lead updated' });
    } catch (err) {
      if (err instanceof Error && err.message === 'Lead not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

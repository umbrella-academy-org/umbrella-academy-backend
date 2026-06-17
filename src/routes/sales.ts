import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { SalesLeadController } from '../controllers/salesLeadController';

const router = Router();

router.get(
  '/dashboard',
  authenticate,
  requireRole('sales_manager', 'admin'),
  SalesLeadController.getDashboard
);

router.get(
  '/leads',
  authenticate,
  requireRole('sales_manager', 'admin'),
  SalesLeadController.getLeads
);

router.patch(
  '/leads/:id',
  authenticate,
  requireRole('sales_manager', 'admin'),
  SalesLeadController.updateLead
);

export default router;

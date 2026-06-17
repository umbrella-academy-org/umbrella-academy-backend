import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { CertificateController } from '../controllers/certificateController';

const router = Router();

router.get('/', authenticate, CertificateController.getMyCertificates);
router.get('/:id/view', authenticate, CertificateController.viewCertificate);
router.get('/:id', authenticate, CertificateController.getCertificateById);

export default router;

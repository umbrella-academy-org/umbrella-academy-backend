import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { FileController } from '../controllers/fileController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/files/upload
router.post('/upload', authenticate, upload.single('file'), FileController.uploadFile);

// POST /api/files/message - chat attachment upload
router.post('/message', authenticate, upload.single('file'), FileController.uploadMessageFile);

// POST /api/files/avatar - upload avatar
router.post('/avatar', authenticate, upload.single('file'), FileController.uploadAvatar);

// GET /api/files/messages/:filename - serve chat attachment (auth required)
router.get('/messages/:filename', authenticate, FileController.serveMessageFile);

// GET /api/files/:filename - serve avatar
router.get('/:filename', FileController.serveFile);

export default router;

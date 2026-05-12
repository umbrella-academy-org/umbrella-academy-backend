import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers/fileController';

const router = Router();

// Use memory storage - no disk writes needed
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/files/upload
router.post('/upload', upload.single('file'), FileController.uploadFile);

// POST /api/files/avatar - upload avatar
router.post('/avatar', upload.single('file'), FileController.uploadAvatar);

// GET /api/files/:filename - serve file (if needed)
router.get('/:filename', FileController.serveFile);

export default router;

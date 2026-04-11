import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();

// Use memory storage — no disk writes needed
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/files/upload (Task 15)
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const url = '/uploads/' + req.file.originalname;
  return res.status(200).json({ success: true, url });
});

export default router;

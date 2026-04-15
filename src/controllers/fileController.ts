import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';

export class FileController {
  // POST /api/files/upload
  static async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      // Validate file
      const validation = FileService.validateFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const url = FileService.generateFileUrl(req.file.originalname);
      const metadata = FileService.getFileMetadata(req.file);

      return res.status(200).json({ 
        success: true, 
        url,
        metadata
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/files/:filename - serve file (if needed)
  static async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      // This would typically serve files from a uploads directory
      // For now, just return file info
      const filename = req.params.filename;
      const url = `/uploads/${filename}`;
      
      res.json({ 
        success: true, 
        data: { filename, url }
      });
    } catch (err) {
      next(err);
    }
  }
}

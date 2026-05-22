import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
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

  // POST /api/files/avatar - upload avatar
  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      // Validate avatar file (images only)
      const validation = FileService.validateAvatar(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      // Generate unique filename and save file to disk
      const uniqueFilename = FileService.generateUniqueFilename(req.file.originalname);
      const savedUrl = await FileService.saveFile(req.file, uniqueFilename);
      const metadata = FileService.getFileMetadata(req.file);

      return res.status(200).json({
        success: true,
        url: savedUrl,
        metadata
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/files/:filename - serve file (if needed)
  static async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = req.params.filename as string;

      const filePath = path.join('uploads', 'avatars', filename.replace('avatars/', ''))

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Set appropriate headers for image files
      const ext = path.extname(filename);
      const contentType = FileController.getContentType(ext);
      console.log(`Content-Type for ${filename}: ${contentType}`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Send the file
      res.sendFile(path.resolve(filePath));
    } catch (err) {
      next(err);
    }
  }

  private static getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return contentTypes[extension] || 'application/octet-stream';
  }
}

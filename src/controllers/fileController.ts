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

      const validation = FileService.validateFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const url = FileService.generateFileUrl(req.file.originalname);
      const metadata = FileService.getFileMetadata(req.file);

      return res.status(200).json({
        success: true,
        url,
        metadata,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/files/message - chat attachment upload
  static async uploadMessageFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const validation = FileService.validateMessageFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const uniqueFilename = FileService.generateUniqueFilename(req.file.originalname);
      const savedUrl = await FileService.saveFile(req.file, uniqueFilename, 'messages');
      const attachment = FileService.getMessageFileMetadata(req.file, savedUrl);

      return res.status(200).json({
        success: true,
        data: attachment,
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

      const validation = FileService.validateAvatar(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const uniqueFilename = FileService.generateUniqueFilename(req.file.originalname);
      const savedUrl = await FileService.saveFile(req.file, uniqueFilename, 'avatars');
      const metadata = FileService.getFileMetadata(req.file);

      return res.status(200).json({
        success: true,
        url: savedUrl,
        metadata,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/files/messages/:filename - serve chat attachment
  static async serveMessageFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = path.basename(req.params.filename as string);
      const filePath = path.join('uploads', 'messages', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const ext = path.extname(filename);
      res.setHeader('Content-Type', FileController.getContentType(ext));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.sendFile(path.resolve(filePath));
    } catch (err) {
      next(err);
    }
  }

  // GET /api/files/:filename - serve avatar
  static async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = path.basename(req.params.filename as string);
      const filePath = path.join('uploads', 'avatars', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const ext = path.extname(filename);
      res.setHeader('Content-Type', FileController.getContentType(ext));
      res.setHeader('Cache-Control', 'public, max-age=31536000');
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
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export class FileService {
  static generateFileUrl(originalName: string): string {
    return '/uploads/' + originalName;
  }

  static generateAvatarUrl(originalName: string): string {
    return '/uploads/avatars/' + originalName;
  }

  static validateFile(file: Express.Multer.File): { isValid: boolean; message?: string } {
    if (!file) {
      return { isValid: false, message: 'No file provided' };
    }

    // Add file validation logic here if needed
    // For example: file size, file type, etc.
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { isValid: false, message: 'File size too large (max 10MB)' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { isValid: false, message: 'File type not allowed' };
    }

    return { isValid: true };
  }

  static validateAvatar(file: Express.Multer.File): { isValid: boolean; message?: string } {
    if (!file) {
      return { isValid: false, message: 'No file provided' };
    }

    // Avatar-specific validation
    const maxSize = 5 * 1024 * 1024; // 5MB for avatars
    if (file.size > maxSize) {
      return { isValid: false, message: 'Avatar size too large (max 5MB)' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { isValid: false, message: 'Avatar must be an image file (JPEG, PNG, GIF, or WebP)' };
    }

    return { isValid: true };
  }

  static getFileMetadata(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: this.generateFileUrl(file.originalname),
    };
  }
}

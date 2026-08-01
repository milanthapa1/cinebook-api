import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { generateUploadSignature } from '../../lib/cloudinary.js';

export class UploadsController {
  static async getSignature(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const folder = (req.query.folder as string) || 'cinebook/avatars';
      const sigData = generateUploadSignature(folder);

      res.status(200).json({
        success: true,
        data: sigData,
      });
    } catch (error) {
      next(error);
    }
  }
}

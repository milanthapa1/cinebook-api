import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { PaymentsService } from './payments.service.js';

export class PaymentsController {
  static async initiate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { bookingId, provider } = req.body;

      if (!bookingId || !provider) {
        return res.status(400).json({ success: false, message: 'bookingId and provider are required' });
      }

      const result = await PaymentsService.initiatePayment(bookingId, provider);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verify(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentsService.verifyPayment(req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async webhook(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Gateway webhook callback handler
      res.status(200).json({ success: true, message: 'Webhook received' });
    } catch (error) {
      next(error);
    }
  }
}

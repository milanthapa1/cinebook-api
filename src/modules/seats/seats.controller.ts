import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { SeatsService } from './seats.service.js';

export class SeatsController {
  static async getSeats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { showtimeId } = req.query;

      if (!showtimeId || typeof showtimeId !== 'string') {
        return res.status(400).json({ success: false, message: 'showtimeId parameter is required' });
      }

      const userId = req.user?.id;
      const seats = await SeatsService.getSeatsForShowtime(showtimeId, userId);

      res.status(200).json({
        success: true,
        data: seats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async holdSeats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { showtimeId, seatIds } = req.body;
      const userId = req.user!.id;

      const result = await SeatsService.holdSeats(showtimeId, seatIds, userId);

      res.status(201).json({
        success: true,
        message: 'Seats held successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async releaseHold(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await SeatsService.releaseHold(id, userId);

      res.status(200).json({
        success: true,
        message: 'Seat hold released',
      });
    } catch (error) {
      next(error);
    }
  }
}

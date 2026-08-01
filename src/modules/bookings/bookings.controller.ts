import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { BookingsService } from './bookings.service.js';

export class BookingsController {
  static async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { showtimeId, seatIds, concessionsAmount } = req.body;
      const userId = req.user!.id;

      const booking = await BookingsService.createBooking(
        userId,
        showtimeId,
        seatIds,
        concessionsAmount || 0
      );

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await BookingsService.getBookingById(id);

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const bookings = await BookingsService.getUserBookings(userId);

      res.status(200).json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
}

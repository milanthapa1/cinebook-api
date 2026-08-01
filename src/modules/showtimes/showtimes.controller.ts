import { Request, Response, NextFunction } from 'express';
import { ShowtimesService } from './showtimes.service.js';

export class ShowtimesController {
  static async getShowtimes(req: Request, res: Response, next: NextFunction) {
    try {
      const { movieId, date, locationId, cinemaId } = req.query;
      const showtimes = await ShowtimesService.getShowtimes(
        movieId as string,
        date as string,
        locationId as string | undefined,
        cinemaId as string | undefined,
      );

      res.status(200).json({
        success: true,
        data: showtimes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHallById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const hall = await ShowtimesService.getHallById(id);

      if (!hall) {
        return res.status(404).json({ success: false, message: 'Hall not found' });
      }

      res.status(200).json({
        success: true,
        data: hall,
      });
    } catch (error) {
      next(error);
    }
  }
}

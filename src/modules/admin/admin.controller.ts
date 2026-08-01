import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { AdminMoviesService } from './admin.movies.service.js';
import { AdminHallsService } from './admin.halls.service.js';
import { AdminShowtimesService } from './admin.showtimes.service.js';
import { AdminBookingsService } from './admin.bookings.service.js';
import { AdminUsersService } from './admin.users.service.js';
import { AdminSeatsService } from './admin.seats.service.js';
import { AdminLocationsService } from './admin.locations.service.js';
import { BookingStatus, Role, SeatType } from '@prisma/client';

export class AdminController {
  // ── Dashboard ────────────────────────────────────────────────────────────
  static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminMoviesService.getStats() }); } catch(e) { next(e); }
  }

  // ── Movies ───────────────────────────────────────────────────────────────
  static async listMovies(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminMoviesService.listMovies() }); } catch(e) { next(e); }
  }
  static async createMovie(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AdminMoviesService.createMovie(req.body) }); } catch(e) { next(e); }
  }
  static async updateMovie(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminMoviesService.updateMovie(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async toggleShowing(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminMoviesService.toggleShowing(req.params.id) }); } catch(e) { next(e); }
  }
  static async deleteMovie(req: AuthRequest, res: Response, next: NextFunction) {
    try { await AdminMoviesService.deleteMovie(req.params.id); res.json({ success: true, message: 'Movie deleted' }); } catch(e) { next(e); }
  }

  // ── Halls ────────────────────────────────────────────────────────────────
  static async listHalls(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminHallsService.listHalls() }); } catch(e) { next(e); }
  }
  static async createHall(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AdminHallsService.createHall(req.body) }); } catch(e) { next(e); }
  }
  static async updateHall(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminHallsService.updateHall(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async deleteHall(req: AuthRequest, res: Response, next: NextFunction) {
    try { await AdminHallsService.deleteHall(req.params.id); res.json({ success: true, message: 'Hall deleted' }); } catch(e) { next(e); }
  }

  // ── Seats ────────────────────────────────────────────────────────────────
  static async getSeatsByHall(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminSeatsService.getSeatsByHall(req.params.hallId) }); } catch(e) { next(e); }
  }
  static async updateSeat(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminSeatsService.updateSeat(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async bulkUpdateSeats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { seatIds, type } = req.body;
      res.json({ success: true, data: await AdminSeatsService.bulkUpdateSeats(req.params.hallId, seatIds, type as SeatType) });
    } catch(e) { next(e); }
  }
  static async addSeatRow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { row, count, type } = req.body;
      res.status(201).json({ success: true, data: await AdminSeatsService.addSeatRow(req.params.hallId, row, count, type as SeatType) });
    } catch(e) { next(e); }
  }
  static async deleteSeatRow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await AdminSeatsService.deleteSeatRow(req.params.hallId, req.params.row) });
    } catch(e) { next(e); }
  }

  // ── Showtimes ─────────────────────────────────────────────────────────────
  static async listShowtimes(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminShowtimesService.listShowtimes(req.query.movieId as string) }); } catch(e) { next(e); }
  }
  static async createShowtime(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AdminShowtimesService.createShowtime(req.body) }); } catch(e) { next(e); }
  }
  static async updateShowtime(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminShowtimesService.updateShowtime(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async deleteShowtime(req: AuthRequest, res: Response, next: NextFunction) {
    try { await AdminShowtimesService.deleteShowtime(req.params.id); res.json({ success: true, message: 'Showtime deleted' }); } catch(e) { next(e); }
  }
  static async bulkDeleteShowtimes(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminShowtimesService.bulkDeleteByMovie(req.params.movieId) }); } catch(e) { next(e); }
  }

  // ── Bookings ──────────────────────────────────────────────────────────────
  static async listBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, search } = req.query;
      res.json({ success: true, ...(await AdminBookingsService.listBookings(
        Number(page)||1, Number(limit)||20, status as BookingStatus, search as string,
      )) });
    } catch(e) { next(e); }
  }
  static async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminBookingsService.getBookingById(req.params.id) }); } catch(e) { next(e); }
  }
  static async updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminBookingsService.updateBookingStatus(req.params.id, req.body.status) }); } catch(e) { next(e); }
  }
  static async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminBookingsService.cancelAndRefund(req.params.id) }); } catch(e) { next(e); }
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  static async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      res.json({ success: true, ...(await AdminUsersService.listUsers(Number(page)||1, Number(limit)||20, search as string)) });
    } catch(e) { next(e); }
  }
  static async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminUsersService.updateUserRole(req.params.id, req.body.role as Role) }); } catch(e) { next(e); }
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  static async listLocations(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.listLocations() }); } catch(e) { next(e); }
  }
  static async createLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AdminLocationsService.createLocation(req.body) }); } catch(e) { next(e); }
  }
  static async updateLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.updateLocation(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async deleteLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.deleteLocation(req.params.id) }); } catch(e) { next(e); }
  }

  // ── Cinemas ───────────────────────────────────────────────────────────────
  static async listCinemas(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.listCinemas(req.query.locationId as string) }); } catch(e) { next(e); }
  }
  static async createCinema(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AdminLocationsService.createCinema(req.body) }); } catch(e) { next(e); }
  }
  static async updateCinema(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.updateCinema(req.params.id, req.body) }); } catch(e) { next(e); }
  }
  static async deleteCinema(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.deleteCinema(req.params.id) }); } catch(e) { next(e); }
  }
  static async assignHallToCinema(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AdminLocationsService.assignHallToCinema(req.params.hallId, req.body.cinemaId ?? null) }); } catch(e) { next(e); }
  }
}

import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticateJWT, requireAdmin } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticateJWT, requireAdmin);

// Dashboard
router.get('/stats',                               AdminController.getStats);

// Movies
router.get('/movies',                              AdminController.listMovies);
router.post('/movies',                             AdminController.createMovie);
router.patch('/movies/:id',                        AdminController.updateMovie);
router.patch('/movies/:id/toggle-showing',         AdminController.toggleShowing);
router.delete('/movies/:id',                       AdminController.deleteMovie);
router.delete('/movies/:movieId/showtimes',        AdminController.bulkDeleteShowtimes);

// Halls
router.get('/halls',                               AdminController.listHalls);
router.post('/halls',                              AdminController.createHall);
router.patch('/halls/:id',                         AdminController.updateHall);
router.delete('/halls/:id',                        AdminController.deleteHall);

// Seats
router.get('/halls/:hallId/seats',                 AdminController.getSeatsByHall);
router.post('/halls/:hallId/seats/row',            AdminController.addSeatRow);
router.patch('/halls/:hallId/seats/bulk',          AdminController.bulkUpdateSeats);
router.patch('/seats/:id',                         AdminController.updateSeat);
router.delete('/halls/:hallId/seats/row/:row',     AdminController.deleteSeatRow);

// Showtimes
router.get('/showtimes',                           AdminController.listShowtimes);
router.post('/showtimes',                          AdminController.createShowtime);
router.patch('/showtimes/:id',                     AdminController.updateShowtime);
router.delete('/showtimes/:id',                    AdminController.deleteShowtime);

// Bookings
router.get('/bookings',                            AdminController.listBookings);
router.get('/bookings/:id',                        AdminController.getBookingById);
router.patch('/bookings/:id/status',               AdminController.updateBookingStatus);
router.post('/bookings/:id/cancel',                AdminController.cancelBooking);

// Users
router.get('/users',                               AdminController.listUsers);
router.patch('/users/:id/role',                    AdminController.updateUserRole);

// Locations
router.get('/locations',                           AdminController.listLocations);
router.post('/locations',                          AdminController.createLocation);
router.patch('/locations/:id',                     AdminController.updateLocation);
router.delete('/locations/:id',                    AdminController.deleteLocation);

// Cinemas
router.get('/cinemas',                             AdminController.listCinemas);
router.post('/cinemas',                            AdminController.createCinema);
router.patch('/cinemas/:id',                       AdminController.updateCinema);
router.delete('/cinemas/:id',                      AdminController.deleteCinema);
router.patch('/halls/:hallId/assign-cinema',       AdminController.assignHallToCinema);

export default router;

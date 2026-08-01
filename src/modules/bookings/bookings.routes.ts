import { Router } from 'express';
import { BookingsController } from './bookings.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/bookings', authenticateJWT, BookingsController.createBooking);
router.get('/bookings/:id', authenticateJWT, BookingsController.getBookingById);
router.get('/users/me/bookings', authenticateJWT, BookingsController.getUserBookings);

export default router;

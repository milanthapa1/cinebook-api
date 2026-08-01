import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { BookingsController } from '../bookings/bookings.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authenticateJWT, UsersController.me);
router.patch('/me', authenticateJWT, UsersController.updateProfile);
router.get('/me/bookings', authenticateJWT, BookingsController.getUserBookings);

export default router;

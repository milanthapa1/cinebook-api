import { Router } from 'express';
import { SeatsController } from './seats.controller.js';
import { authenticateJWT, optionalAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// Optional auth for seat viewing - allows unauthenticated users to see seat availability
// but provides heldByCurrentUser status when authenticated
router.get('/seats', optionalAuth, SeatsController.getSeats);
router.post('/seat-holds', authenticateJWT, SeatsController.holdSeats);
router.delete('/seat-holds/:id', authenticateJWT, SeatsController.releaseHold);

export default router;

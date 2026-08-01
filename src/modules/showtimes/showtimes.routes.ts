import { Router } from 'express';
import { ShowtimesController } from './showtimes.controller.js';

const router = Router();

router.get('/showtimes', ShowtimesController.getShowtimes);
router.get('/halls/:id', ShowtimesController.getHallById);

export default router;

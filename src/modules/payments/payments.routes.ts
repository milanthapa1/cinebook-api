import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { paymentRateLimiter } from '../../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/initiate', authenticateJWT, paymentRateLimiter, PaymentsController.initiate);
router.post('/verify', authenticateJWT, paymentRateLimiter, PaymentsController.verify);
router.post('/webhook', PaymentsController.webhook);

export default router;

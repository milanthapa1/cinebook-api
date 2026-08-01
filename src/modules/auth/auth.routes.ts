import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from './auth.schema.js';

const router = Router();

router.post('/register', authRateLimiter, validateRequest(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/google', authRateLimiter, AuthController.googleLogin);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;

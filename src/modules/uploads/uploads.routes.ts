import { Router } from 'express';
import { UploadsController } from './uploads.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/signature', authenticateJWT, UploadsController.getSignature);

export default router;

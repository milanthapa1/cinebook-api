import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import moviesRoutes from './modules/movies/movies.routes.js';
import showtimesRoutes from './modules/showtimes/showtimes.routes.js';
import seatsRoutes from './modules/seats/seats.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import uploadsRoutes from './modules/uploads/uploads.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { AdminLocationsService } from './modules/admin/admin.locations.service.js';

const app = express();

// CORS configuration - strict locking to frontend origin
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'cinebook-api', timestamp: new Date() });
});

// API Routes (Versioned under /api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/movies', moviesRoutes);
app.use('/api/v1', showtimesRoutes);
app.use('/api/v1', seatsRoutes);
app.use('/api/v1', bookingsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/uploads', uploadsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Public locations endpoint — no auth required (used by frontend location picker)
app.get('/api/v1/locations', async (req, res) => {
  try {
    const locations = await AdminLocationsService.getPublicLocations();
    res.json({ success: true, data: locations });
  } catch {
    res.status(500).json({ success: false, message: 'Could not fetch locations' });
  }
});

// Error Handler
app.use(errorHandler);

export default app;

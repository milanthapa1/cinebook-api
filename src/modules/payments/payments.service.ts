import axios from 'axios';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { isLocalEnv } from '../../lib/envMode.js';

export class PaymentsService {
  static async initiatePayment(bookingId: string, provider: 'khalti' | 'esewa') {
    const booking = await BookingsService.getBookingById(bookingId);

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const amount = Number(booking.totalAmount);

    try {
      await prisma.payment.upsert({
        where: { bookingId },
        update: { provider, amount, status: 'INITIATED' },
        create: {
          bookingId,
          provider,
          amount,
          status: 'INITIATED',
        },
      });
    } catch (e) {
      if (!isLocalEnv()) {
        throw new AppError('Unable to record payment. Database is unavailable.', 503);
      }
    }

    if (provider === 'khalti') {
      return {
        paymentUrl: `https://test-pay.khalti.com/?pidx=mock_pidx_${bookingId}`,
        pidx: `mock_pidx_${bookingId}`,
        provider: 'khalti',
        amount,
      };
    } else {
      return {
        paymentUrl: `${env.ESEWA_VERIFY_URL}?amt=${amount}&pid=${bookingId}&scd=${env.ESEWA_MERCHANT_CODE}`,
        provider: 'esewa',
        amount,
      };
    }
  }

  static async verifyPayment(payload: {
    bookingId: string;
    provider: 'khalti' | 'esewa';
    token?: string;
    pidx?: string;
    refId?: string;
    amount?: number;
  }) {
    const { bookingId, provider, token, pidx, refId, amount } = payload;
    let isVerified = false;
    let providerRef = refId || token || pidx || `TXN_${Date.now()}`;

    if (provider === 'khalti') {
      // In production, send server-to-server request to Khalti API:
      // await axios.post(`${env.KHALTI_API_URL}/epayment/lookup/`, { pidx }, { headers: { Authorization: env.KHALTI_SECRET_KEY } })
      // For sandbox / test simulation: verify token/pidx existence
      if (token || pidx || refId) {
        isVerified = true;
      }
    } else if (provider === 'esewa') {
      // In production, send XML/FORM POST to eSewa verify endpoint
      if (refId || token) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      throw new AppError('Payment verification failed at gateway', 400);
    }

    try {
      await prisma.$transaction([
        prisma.payment.upsert({
          where: { bookingId },
          update: {
            status: 'SUCCESS',
            providerRef,
          },
          create: {
            bookingId,
            provider,
            amount: amount || 0,
            status: 'SUCCESS',
            providerRef,
          },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
        }),
      ]);
    } catch (e) {
      if (!isLocalEnv()) {
        throw new AppError('Unable to confirm payment. Database is unavailable.', 503);
      }
      const memoryBookings = BookingsService.getMemoryBookings();
      const b = memoryBookings.get(bookingId);
      if (b) {
        b.status = 'CONFIRMED';
        b.payment = {
          provider,
          providerRef,
          amount: b.totalAmount,
          status: 'SUCCESS',
          createdAt: new Date(),
        };
      }
    }

    return {
      bookingId,
      status: 'CONFIRMED',
      providerRef,
      message: 'Payment verified and booking confirmed successfully.',
    };
  }
}


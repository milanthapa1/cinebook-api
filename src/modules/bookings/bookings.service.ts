import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { isLocalEnv } from '../../lib/envMode.js';
import { computeBookingTotals, VAT_RATE } from '../../lib/pricing.js';
import { SeatsService } from '../seats/seats.service.js';

const memoryBookings = new Map<string, any>();

function attachPricing(booking: any, seatsTotal: number) {
  const pricing = computeBookingTotals(seatsTotal);
  return { ...booking, pricing };
}

async function enrichBookingSeats(booking: any) {
  if (!booking?.seats?.length) return booking;
  const seatIds = booking.seats.map((s: any) => s.seatId);
  const seatRows = await prisma.seat.findMany({ where: { id: { in: seatIds } } });
  const byId = new Map(seatRows.map((s) => [s.id, s]));
  booking.seats = booking.seats.map((bs: any) => {
    const seat = byId.get(bs.seatId);
    return seat
      ? {
          ...bs,
          seatDetails: { row: seat.row, number: seat.number, type: seat.type },
        }
      : bs;
  });
  return booking;
}

export class BookingsService {
  static async createBooking(userId: string, showtimeId: string, seatIds: string[]) {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('No seats specified for booking', 400);
    }

    const now = new Date();

    if (!isLocalEnv()) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const activeHolds = await tx.seatHold.findMany({
            where: {
              showtimeId,
              seatId: { in: seatIds },
              userId,
              expiresAt: { gt: now },
            },
          });

          if (activeHolds.length !== seatIds.length) {
            throw new AppError('Your seat holds have expired or are invalid. Please re-select your seats.', 400);
          }

          const showtime = await tx.showtime.findUnique({
            where: { id: showtimeId },
            include: { movie: true, hall: { include: { seats: true } } },
          });

          if (!showtime) {
            throw new AppError('Showtime not found', 404);
          }

          const basePrice = Number(showtime.basePrice);
          const premiumPrice = Number(showtime.premiumPrice);

          const seatPriceMap = new Map<string, number>();
          let seatsTotal = 0;

          for (const seatId of seatIds) {
            const seatObj = showtime.hall.seats.find((s: any) => s.id === seatId);
            const seatType = seatObj?.type || 'STANDARD';
            const price = seatType === 'RECLINER' ? premiumPrice * 1.3 : seatType === 'PREMIUM' ? premiumPrice : basePrice;

            const finalSeatPrice = Math.round(price);
            seatPriceMap.set(seatId, finalSeatPrice);
            seatsTotal += finalSeatPrice;
          }

          const { totalAmount } = computeBookingTotals(seatsTotal);

          const booking = await tx.booking.create({
            data: {
              userId,
              showtimeId,
              totalAmount,
              status: 'PENDING',
              qrPayload: `CINEBOOK-REF-${Date.now()}-${userId.slice(-6)}`,
              seats: {
                create: seatIds.map((seatId) => ({
                  seatId,
                  priceAtBooking: seatPriceMap.get(seatId) || basePrice,
                })),
              },
            },
            include: {
              seats: true,
              showtime: { include: { movie: true, hall: true } },
            },
          });

          await tx.seatHold.deleteMany({
            where: { showtimeId, seatId: { in: seatIds }, userId },
          });

          return attachPricing(booking, seatsTotal);
        });

        return enrichBookingSeats(result);
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('Unable to create booking. Database is unavailable.', 503);
      }
    }

    // Memory transaction execution for test mode
    const bookingId = `bk_${Date.now()}`;
    const memoryBookedSeats = SeatsService.getMemoryBookedSeats();

    let seatsTotal = 0;
    const bookingSeats = seatIds.map((seatId) => {
      const row = seatId.split('_').pop()?.charAt(0) || 'A';
      const num = parseInt(seatId.split('_').pop()?.slice(1) || '1', 10);
      const type = row === 'E' || row === 'F' ? 'RECLINER' : row === 'C' || row === 'D' ? 'PREMIUM' : 'STANDARD';
      const price = type === 'RECLINER' ? 850 : type === 'PREMIUM' ? 650 : 450;
      seatsTotal += price;

      memoryBookedSeats.add(`${showtimeId}_${seatId}`);

      return {
        id: `bks_${Date.now()}_${seatId}`,
        bookingId,
        seatId,
        priceAtBooking: price,
        seatDetails: { row, number: num, type },
      };
    });

    const { totalAmount } = computeBookingTotals(seatsTotal);
    const mockBooking = attachPricing(
      {
        id: bookingId,
        userId,
        showtimeId,
        totalAmount,
        status: 'PENDING',
        qrPayload: `CINEBOOK-TICKET-${bookingId}`,
        createdAt: new Date(),
        seats: bookingSeats,
        showtime: {
          id: showtimeId,
          startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          movie: {
            title: 'Dune: Part Two',
            posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
            format: ['IMAX', '3D'],
            language: 'English',
            rating: 'PG-13',
            runtimeMins: 166,
          },
          hall: {
            name: 'Audi 1 (IMAX Laser)',
            screenType: '4K Dual Laser 3D',
            soundSystem: 'Dolby Atmos 12.1',
          },
        },
      },
      seatsTotal,
    );

    memoryBookings.set(bookingId, mockBooking);
    return mockBooking;
  }

  static async getBookingById(bookingId: string) {
    if (!isLocalEnv()) {
      try {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            seats: true,
            showtime: { include: { movie: true, hall: true } },
            payment: true,
            user: { select: { id: true, name: true, email: true } },
          },
        });
        if (!booking) return null;

        const seatsTotal = booking.seats.reduce((sum, s) => sum + Number(s.priceAtBooking), 0);
        const totalAmount = Number(booking.totalAmount);
        const subtotal = Math.round(totalAmount / (1 + VAT_RATE));
        const vatAmount = totalAmount - subtotal;
        const enriched = await enrichBookingSeats(booking);
        return {
          ...enriched,
          pricing: { seatsTotal, subtotal, vatAmount, totalAmount },
        };
      } catch (e) {
        throw new AppError('Unable to load booking. Database is unavailable.', 503);
      }
    }

    return memoryBookings.get(bookingId) || null;
  }

  static async getUserBookings(userId: string) {
    if (!isLocalEnv()) {
      try {
        return await prisma.booking.findMany({
          where: { userId },
          include: {
            seats: true,
            showtime: { include: { movie: true, hall: true } },
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (e) {
        throw new AppError('Unable to load bookings. Database is unavailable.', 503);
      }
    }

    return Array.from(memoryBookings.values()).filter((b) => b.userId === userId);
  }

  static getMemoryBookings() {
    return memoryBookings;
  }
}


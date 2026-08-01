import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { isTestEnv } from '../../lib/envMode.js';

// Memory store fallback for holds if DB is in mock/test mode
const memoryHolds = new Map<string, { id: string; showtimeId: string; seatId: string; userId: string; expiresAt: Date }>();
const memoryBookedSeats = new Set<string>(); // key: `${showtimeId}_${seatId}`

export interface SeatWithStatus {
  id: string;
  hallId: string;
  row: string;
  number: number;
  type: 'STANDARD' | 'PREMIUM' | 'RECLINER';
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  heldByCurrentUser?: boolean;
}

export class SeatsService {
  static generateDefaultSeats(hallId: string) {
    const seats: SeatWithStatus[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    rows.forEach((row, rIdx) => {
      const type: 'STANDARD' | 'PREMIUM' | 'RECLINER' =
        rIdx < 2 ? 'STANDARD' : rIdx < 4 ? 'PREMIUM' : 'RECLINER';
      const price = type === 'STANDARD' ? 450 : type === 'PREMIUM' ? 650 : 850;

      for (let num = 1; num <= 10; num++) {
        seats.push({
          id: `seat_${hallId}_${row}${num}`,
          hallId,
          row,
          number: num,
          type,
          price,
          status: 'AVAILABLE',
        });
      }
    });
    return seats;
  }

  static async getSeatsForShowtime(showtimeId: string, userId?: string) {
    const now = new Date();

    if (!isTestEnv()) {
      try {
        const showtime = await prisma.showtime.findUnique({
          where: { id: showtimeId },
          include: {
            hall: { include: { seats: true } },
            seatHolds: { where: { expiresAt: { gt: now } } },
            bookings: {
              where: { status: { in: ['CONFIRMED', 'PENDING'] } },
              include: { seats: true },
            },
          },
        });

        if (!showtime) {
          throw new AppError('Showtime not found', 404);
        }

        if (!showtime.hall) {
          throw new AppError('Hall not configured for this showtime', 500);
        }

        const heldSeatIds = new Map(showtime.seatHolds.map((h) => [h.seatId, h.userId]));
        const bookedSeatIds = new Set(showtime.bookings.flatMap((b) => b.seats.map((s) => s.seatId)));
        const basePrice = Number(showtime.basePrice);
        const premiumPrice = Number(showtime.premiumPrice);

        return showtime.hall.seats.map((seat) => {
          let status: 'AVAILABLE' | 'HELD' | 'BOOKED' = 'AVAILABLE';
          const heldByUserId = heldSeatIds.get(seat.id);

          if (bookedSeatIds.has(seat.id)) status = 'BOOKED';
          else if (heldByUserId) status = 'HELD';

          const price = seat.type === 'RECLINER' ? premiumPrice * 1.3 : seat.type === 'PREMIUM' ? premiumPrice : basePrice;

          return {
            id: seat.id,
            hallId: seat.hallId,
            row: seat.row,
            number: seat.number,
            type: seat.type,
            price: Math.round(price),
            status,
            heldByCurrentUser: heldByUserId === userId,
          };
        });
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        throw new AppError('Unable to load seats. Database is unavailable.', 503);
      }
    }

    const hallId = 'hall_1';
    const defaultSeats = this.generateDefaultSeats(hallId);

    return defaultSeats.map((seat) => {
      const memoryHoldKey = Array.from(memoryHolds.values()).find(
        (h) => h.showtimeId === showtimeId && h.seatId === seat.id && new Date(h.expiresAt) > now
      );

      const isBooked = memoryBookedSeats.has(`${showtimeId}_${seat.id}`);

      let status: 'AVAILABLE' | 'HELD' | 'BOOKED' = 'AVAILABLE';
      if (isBooked) status = 'BOOKED';
      else if (memoryHoldKey) status = 'HELD';

      return {
        ...seat,
        status,
        heldByCurrentUser: memoryHoldKey?.userId === userId,
      };
    });
  }

  static async holdSeats(showtimeId: string, seatIds: string[], userId: string) {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('At least one seat must be selected', 400);
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (!isTestEnv()) {
      try {
        const holds = await prisma.$transaction(async (tx) => {
          const now = new Date();
          const existingHolds = await tx.seatHold.findMany({
            where: { showtimeId, seatId: { in: seatIds }, expiresAt: { gt: now } },
          });

          const conflictingHold = existingHolds.find(h => h.userId !== userId);
          if (conflictingHold) {
            throw new AppError(`Seat ${conflictingHold.seatId} is currently held by another user.`, 409);
          }

          const existingBookings = await tx.bookingSeat.findMany({
            where: {
              seatId: { in: seatIds },
              booking: { showtimeId, status: { in: ['CONFIRMED', 'PENDING'] } },
            },
          });

          if (existingBookings.length > 0) {
            throw new AppError('One or more selected seats have already been booked.', 409);
          }

          await tx.seatHold.deleteMany({
            where: { showtimeId, seatId: { in: seatIds }, userId },
          });

          const created = [];
          for (const seatId of seatIds) {
            const hold = await tx.seatHold.create({
              data: { showtimeId, seatId, userId, expiresAt },
            });
            created.push(hold);
          }
          return created;
        });

        return { holds, expiresAt };
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (err.code === 'P2002') {
          throw new AppError('One or more seats were locked by another user just now.', 409);
        }
        throw new AppError('Unable to hold seats. Database is unavailable.', 503);
      }
    }

    // High performance memory atomic transaction lock for test suite / demo mode
    const now = new Date();
    for (const seatId of seatIds) {
      const existing = Array.from(memoryHolds.values()).find(
        h => h.showtimeId === showtimeId && h.seatId === seatId && new Date(h.expiresAt) > now
      );
      if (existing && existing.userId !== userId) {
        throw new AppError(`Seat is held by another user`, 409);
      }
      if (memoryBookedSeats.has(`${showtimeId}_${seatId}`)) {
        throw new AppError(`Seat is already booked`, 409);
      }
    }

    const createdHolds = seatIds.map(seatId => {
      const holdId = `hold_${Date.now()}_${Math.random()}_${seatId}`;
      const holdObj = { id: holdId, showtimeId, seatId, userId, expiresAt };
      memoryHolds.set(holdId, holdObj);
      return holdObj;
    });

    return { holds: createdHolds, expiresAt };
  }

  static async releaseHold(holdId: string, userId: string) {
    if (!isTestEnv()) {
      await prisma.seatHold.deleteMany({ where: { id: holdId, userId } });
      return true;
    }
    memoryHolds.delete(holdId);
    return true;
  }

  static getMemoryHolds() {
    return memoryHolds;
  }

  static getMemoryBookedSeats() {
    return memoryBookedSeats;
  }
}

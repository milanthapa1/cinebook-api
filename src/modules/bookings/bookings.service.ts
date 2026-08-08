import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { isLocalEnv } from '../../lib/envMode.js';
import { computeBookingTotals, VAT_RATE } from '../../lib/pricing.js';
import { SeatsService } from '../seats/seats.service.js';
import { getMockShowtimeById } from '../showtimes/showtimes.mock.js';

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'local_bookings.json');

const memoryBookings = new Map<string, any>();

function loadMemoryBookingsFromFile() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const memoryBookedSeats = SeatsService.getMemoryBookedSeats();
        for (const item of parsed) {
          if (item?.id) {
            memoryBookings.set(item.id, item);
            if (item.seats && Array.isArray(item.seats)) {
              for (const s of item.seats) {
                if (s.seatId && item.showtimeId) {
                  memoryBookedSeats.add(`${item.showtimeId}_${s.seatId}`);
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore read error
  }
}

export function saveMemoryBookingsToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const arr = Array.from(memoryBookings.values());
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    // Ignore write error
  }
}

// Initial load from disk on module startup
loadMemoryBookingsFromFile();

function attachPricing(booking: any, seatsTotal: number) {
  const pricing = computeBookingTotals(seatsTotal);
  return { ...booking, pricing };
}

/**
 * Extracts row letter and seat number from seat ID strings.
 * Handles formats like:
 *   seat_hall_1_C5  → { row: 'C', number: 5 }
 *   seat_hall_2_A10 → { row: 'A', number: 10 }
 *   C5, A3, D10    → { row: 'C', number: 5 }
 */
function parseSeatId(seatId: string): { row: string; number: number } {
  // Match a single uppercase/lowercase letter followed by one or more digits at the END of the string
  const trailMatch = seatId.match(/([A-Fa-f])([0-9]+)$/);
  if (trailMatch) {
    return { row: trailMatch[1].toUpperCase(), number: parseInt(trailMatch[2], 10) };
  }
  // Fallback: last letter+digit group anywhere
  const allMatches = Array.from(seatId.matchAll(/([A-Fa-f])([0-9]+)/g));
  if (allMatches.length > 0) {
    const last = allMatches[allMatches.length - 1];
    return { row: last[1].toUpperCase(), number: parseInt(last[2], 10) };
  }
  return { row: 'A', number: 1 };
}

async function enrichBookingSeats(booking: any) {
  if (!booking?.seats?.length) return booking;
  const seatIds = booking.seats.map((s: any) => s.seatId);
  let seatRows: any[] = [];
  try {
    seatRows = await prisma.seat.findMany({ where: { id: { in: seatIds } } });
  } catch (e) {
    // DB fallback
  }

  const byId = new Map(seatRows.map((s) => [s.id, s]));
  booking.seats = booking.seats.map((bs: any) => {
    const seat = byId.get(bs.seatId);
    if (seat) {
      return {
        ...bs,
        seatDetails: { row: seat.row, number: seat.number, type: seat.type },
      };
    }
    const parsed = parseSeatId(bs.seatId);
    const seatType = parsed.row === 'E' || parsed.row === 'F' ? 'RECLINER'
      : parsed.row === 'C' || parsed.row === 'D' ? 'PREMIUM' : 'STANDARD';
    return {
      ...bs,
      seatDetails: bs.seatDetails || { row: parsed.row, number: parsed.number, type: seatType },
    };
  });
  return booking;
}

export class BookingsService {
  static async createBooking(userId: string, showtimeId: string, seatIds: string[]) {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('No seats specified for booking', 400);
    }

    // ── Past showtime guard ────────────────────────────────────────────────
    // Block booking creation if the showtime has already started or is within
    // the 10-minute cut-off window. This is enforced at both the API layer
    // and the seat-hold layer for defence-in-depth.
    const mockSt = getMockShowtimeById(showtimeId);
    if (mockSt && new Date(mockSt.startsAt).getTime() - Date.now() < 10 * 60 * 1000) {
      throw new AppError('This showtime has already started. Booking is no longer available.', 400);
    }

    const now = new Date();

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

      return await enrichBookingSeats(result);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (!isLocalEnv()) {
        throw new AppError('Unable to create booking. Database is unavailable.', 503);
      }
    }

    // Memory transaction execution for test mode / fallback
    const bookingId = `bk_${Date.now()}`;
    const memoryBookedSeats = SeatsService.getMemoryBookedSeats();

    // Resolve hall+time slot so that the same physical seat is
    // blocked across ALL movies at the same hall & start time.
    const mockShowtimeDetails = getMockShowtimeById(showtimeId);
    const hallId = showtimeId.includes('hall_2') ? 'hall_2' : showtimeId.includes('hall_3') ? 'hall_3' : 'hall_1';
    const startsAtKey = new Date(mockShowtimeDetails.startsAt).toISOString().slice(0, 16);

    let seatsTotal = 0;
    const bookingSeats = seatIds.map((seatId) => {
      const parsed = parseSeatId(seatId);
      const { row, number: num } = parsed;
      const type = row === 'E' || row === 'F' ? 'RECLINER' : row === 'C' || row === 'D' ? 'PREMIUM' : 'STANDARD';
      const price = type === 'RECLINER' ? 850 : type === 'PREMIUM' ? 650 : 450;
      seatsTotal += price;

      // Register under both key formats so cross-movie same-hall same-time lookups work
      const cleanSeat = `${row}${num}`;
      memoryBookedSeats.add(`${showtimeId}_${seatId}`);
      memoryBookedSeats.add(`${hallId}_${startsAtKey}_${seatId}`);
      memoryBookedSeats.add(`${showtimeId}_${cleanSeat}`);
      memoryBookedSeats.add(`${hallId}_${startsAtKey}_${cleanSeat}`);

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
        showtime: mockShowtimeDetails,
      },
      seatsTotal,
    );

    memoryBookings.set(bookingId, mockBooking);
    saveMemoryBookingsToFile();
    return mockBooking;

  }

  static async getBookingById(bookingId: string) {
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
      if (booking) {
        const seatsTotal = booking.seats.reduce((sum, s) => sum + Number(s.priceAtBooking), 0);
        const totalAmount = Number(booking.totalAmount);
        const subtotal = Math.round(totalAmount / (1 + VAT_RATE));
        const vatAmount = totalAmount - subtotal;
        const enriched = await enrichBookingSeats(booking);
        return {
          ...enriched,
          pricing: { seatsTotal, subtotal, vatAmount, totalAmount },
        };
      }
    } catch (e) {
      if (!isLocalEnv()) {
        throw new AppError('Unable to load booking. Database is unavailable.', 503);
      }
    }

    return memoryBookings.get(bookingId) || null;
  }

  static async getUserBookings(userId: string) {
    try {
      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          seats: true,
          showtime: { include: { movie: true, hall: true } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (bookings && bookings.length > 0) return bookings;
    } catch (e) {
      if (!isLocalEnv()) {
        throw new AppError('Unable to load bookings. Database is unavailable.', 503);
      }
    }

    return Array.from(memoryBookings.values()).filter((b) => b.userId === userId);
  }

  static getMemoryBookings() {
    return memoryBookings;
  }
}



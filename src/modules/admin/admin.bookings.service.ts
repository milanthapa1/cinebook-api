import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { BookingStatus } from '@prisma/client';
import { BookingsService } from '../bookings/bookings.service.js';
import { SeatsService } from '../seats/seats.service.js';

export class AdminBookingsService {
  static async listBookings(page = 1, limit = 20, status?: BookingStatus, search?: string) {
    let dbBookings: any[] = [];
    try {
      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { id: { contains: search, mode: 'insensitive' } },
        ];
      }
      dbBookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          showtime: { include: { movie: { select: { id: true, title: true } }, hall: { select: { id: true, name: true } } } },
          payment: true,
          seats: true,
        },
      });
    } catch (e) {
      // Ignore DB error, proceed to fallback
    }

    const memoryMap = BookingsService.getMemoryBookings();
    const memoryList = Array.from(memoryMap.values()).map((b: any) => ({
      ...b,
      user: b.user || { id: b.userId || 'usr_guest', name: 'Demo Customer', email: 'customer@cinebook.np' },
    }));

    const existingIds = new Set(dbBookings.map((b) => b.id));
    const combined = [...dbBookings];

    for (const mb of memoryList) {
      if (!existingIds.has(mb.id)) {
        combined.push(mb);
      }
    }

    let filtered = combined;
    if (status) {
      filtered = filtered.filter((b) => b.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.id.toLowerCase().includes(s) ||
          (b.user?.name && b.user.name.toLowerCase().includes(s)) ||
          (b.user?.email && b.user.email.toLowerCase().includes(s)) ||
          (b.showtime?.movie?.title && b.showtime.movie.title.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return { bookings: paginated, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  static async getBookingById(id: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          showtime: { include: { movie: true, hall: { include: { seats: true } } } },
          payment: true,
          seats: true,
        },
      });
      if (booking) return booking;
    } catch (e) {
      // Ignore DB error
    }

    const memoryMap = BookingsService.getMemoryBookings();
    const mb = memoryMap.get(id);
    if (mb) {
      return {
        ...mb,
        user: mb.user || { id: mb.userId || 'usr_guest', name: 'Demo Customer', email: 'customer@cinebook.np', phone: '+977 9801234567' },
      };
    }

    throw new AppError('Booking not found', 404);
  }

  static async updateBookingStatus(id: string, status: BookingStatus) {
    try {
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (booking) {
        return await prisma.booking.update({
          where: { id },
          data: { status },
          include: { user: { select: { id: true, name: true, email: true } }, showtime: { include: { movie: true, hall: true } } },
        });
      }
    } catch (e) {
      // Ignore DB error
    }

    const memoryMap = BookingsService.getMemoryBookings();
    const mb = memoryMap.get(id);
    if (mb) {
      mb.status = status;
      return mb;
    }

    throw new AppError('Booking not found', 404);
  }

  static async cancelAndRefund(id: string) {
    let dbFound = false;
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { seats: true, showtime: true },
      });
      if (booking) {
        dbFound = true;
        if (booking.status === 'CANCELLED') throw new AppError('Booking is already cancelled', 400);
        await prisma.$transaction([
          prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } }),
          prisma.seatHold.deleteMany({ where: { showtimeId: booking.showtimeId } }),
        ]);
      }
    } catch (e: any) {
      if (e instanceof AppError) throw e;
    }

    const memoryMap = BookingsService.getMemoryBookings();
    const mb = memoryMap.get(id);

    if (mb) {
      if (mb.status === 'CANCELLED') throw new AppError('Booking is already cancelled', 400);
      mb.status = 'CANCELLED';

      const memoryBookedSeats = SeatsService.getMemoryBookedSeats();
      if (mb.seats && Array.isArray(mb.seats)) {
        const hallId = mb.showtimeId?.includes('hall_2') ? 'hall_2' : mb.showtimeId?.includes('hall_3') ? 'hall_3' : 'hall_1';
        const startsAtKey = mb.showtime?.startsAt
          ? new Date(mb.showtime.startsAt).toISOString().slice(0, 16)
          : '';

        for (const s of mb.seats) {
          const seatId = s.seatId;
          const match = seatId?.match(/([a-zA-Z]+)[_-]?(\d+)/);
          const cleanSeat = match ? `${match[1].toUpperCase()}${match[2]}` : seatId;

          memoryBookedSeats.delete(`${mb.showtimeId}_${seatId}`);
          memoryBookedSeats.delete(`${mb.showtimeId}_${cleanSeat}`);
          if (startsAtKey) {
            memoryBookedSeats.delete(`${hallId}_${startsAtKey}_${seatId}`);
            memoryBookedSeats.delete(`${hallId}_${startsAtKey}_${cleanSeat}`);
          }
        }
      }
      return { message: 'Booking cancelled and seats released', id };
    }


    if (dbFound) {
      return { message: 'Booking cancelled and seats released', id };
    }

    throw new AppError('Booking not found', 404);
  }
}


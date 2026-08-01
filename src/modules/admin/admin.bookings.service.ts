import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { BookingStatus } from '@prisma/client';

export class AdminBookingsService {
  static async listBookings(page = 1, limit = 20, status?: BookingStatus, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          showtime: { include: { movie: { select: { id: true, title: true } }, hall: { select: { id: true, name: true } } } },
          payment: true,
          seats: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);
    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getBookingById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        showtime: { include: { movie: true, hall: { include: { seats: true } } } },
        payment: true,
        seats: true,
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  }

  static async updateBookingStatus(id: string, status: BookingStatus) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('Booking not found', 404);
    return prisma.booking.update({
      where: { id }, data: { status },
      include: { user: { select: { id: true, name: true, email: true } }, showtime: { include: { movie: true, hall: true } } },
    });
  }

  static async cancelAndRefund(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id }, include: { seats: true, showtime: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status === 'CANCELLED') throw new AppError('Booking is already cancelled', 400);
    // Release booked seats (delete holds, update booking status)
    await prisma.$transaction([
      prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } }),
      prisma.seatHold.deleteMany({ where: { showtimeId: booking.showtimeId } }),
    ]);
    return { message: 'Booking cancelled and seats released', id };
  }
}

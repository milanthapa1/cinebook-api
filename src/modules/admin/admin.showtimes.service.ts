import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';

export class AdminShowtimesService {
  static async listShowtimes(movieId?: string) {
    return prisma.showtime.findMany({
      where: movieId ? { movieId } : undefined,
      include: {
        movie: { select: { id: true, title: true, posterUrl: true } },
        hall: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  static async createShowtime(data: { movieId: string; hallId: string; startsAt: string; basePrice: number; premiumPrice: number }) {
    const [movie, hall] = await Promise.all([
      prisma.movie.findUnique({ where: { id: data.movieId } }),
      prisma.hall.findUnique({ where: { id: data.hallId } }),
    ]);
    if (!movie) throw new AppError('Movie not found', 404);
    if (!hall) throw new AppError('Hall not found', 404);
    return prisma.showtime.create({
      data: { ...data, startsAt: new Date(data.startsAt) },
      include: { movie: { select: { id: true, title: true } }, hall: { select: { id: true, name: true } } },
    });
  }

  static async updateShowtime(id: string, data: Partial<{ startsAt: string; basePrice: number; premiumPrice: number }>) {
    const st = await prisma.showtime.findUnique({ where: { id } });
    if (!st) throw new AppError('Showtime not found', 404);
    const upd: any = { ...data };
    if (data.startsAt) upd.startsAt = new Date(data.startsAt);
    return prisma.showtime.update({
      where: { id }, data: upd,
      include: { movie: { select: { id: true, title: true } }, hall: { select: { id: true, name: true } } },
    });
  }

  static async deleteShowtime(id: string) {
    const st = await prisma.showtime.findUnique({ where: { id } });
    if (!st) throw new AppError('Showtime not found', 404);
    await prisma.seatHold.deleteMany({ where: { showtimeId: id } });
    await prisma.showtime.delete({ where: { id } });
    return { message: 'Showtime deleted' };
  }

  static async bulkDeleteByMovie(movieId: string) {
    const showtimes = await prisma.showtime.findMany({ where: { movieId }, select: { id: true } });
    const ids = showtimes.map(s => s.id);
    await prisma.seatHold.deleteMany({ where: { showtimeId: { in: ids } } });
    const { count } = await prisma.showtime.deleteMany({ where: { movieId } });
    return { message: `${count} showtimes deleted` };
  }
}

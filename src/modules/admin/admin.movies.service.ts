import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';

export class AdminMoviesService {
  static async listMovies() {
    return prisma.movie.findMany({ orderBy: { releaseDate: 'desc' } });
  }

  static async createMovie(data: {
    title: string; synopsis: string; posterUrl: string; bannerUrl?: string; trailerUrl?: string;
    genre: string[]; language: string; format: string[]; runtimeMins: number;
    rating: string; cast: { name: string; role: string; photoUrl: string }[];
    director?: string; releaseDate: string; isShowing: boolean;
  }) {
    return prisma.movie.create({
      data: { ...data, releaseDate: new Date(data.releaseDate), cast: data.cast as any },
    });
  }

  static async updateMovie(id: string, data: Partial<{
    title: string; synopsis: string; posterUrl: string; bannerUrl: string; trailerUrl: string;
    genre: string[]; language: string; format: string[]; runtimeMins: number;
    rating: string; cast: { name: string; role: string; photoUrl: string }[];
    director: string; releaseDate: string; isShowing: boolean;
  }>) {
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new AppError('Movie not found', 404);
    const upd: any = { ...data };
    if (data.releaseDate) upd.releaseDate = new Date(data.releaseDate);
    if (data.cast) upd.cast = data.cast as any;
    return prisma.movie.update({ where: { id }, data: upd });
  }

  static async toggleShowing(id: string) {
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new AppError('Movie not found', 404);
    return prisma.movie.update({ where: { id }, data: { isShowing: !movie.isShowing } });
  }

  static async deleteMovie(id: string) {
    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new AppError('Movie not found', 404);
    await prisma.movie.delete({ where: { id } });
    return { message: 'Movie deleted' };
  }

  static async getStats() {
    const [totalMovies, nowShowing, totalBookings, totalUsers, recentBookings, topMovies] = await Promise.all([
      prisma.movie.count(),
      prisma.movie.count({ where: { isShowing: true } }),
      prisma.booking.count(),
      prisma.user.count(),
      prisma.booking.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          showtime: { include: { movie: { select: { title: true } } } },
        },
      }),
      // Top movies by booking count
      prisma.showtime.findMany({
        include: {
          movie: { select: { id: true, title: true, posterUrl: true } },
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    const revenue = await prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'CONFIRMED' },
    });

    // Aggregate bookings per movie
    const movieBookings: Record<string, { title: string; posterUrl: string; count: number }> = {};
    topMovies.forEach(st => {
      const mid = st.movie.id;
      if (!movieBookings[mid]) movieBookings[mid] = { title: st.movie.title, posterUrl: st.movie.posterUrl, count: 0 };
      movieBookings[mid].count += st._count.bookings;
    });
    const topMoviesList = Object.entries(movieBookings)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, v]) => ({ id, ...v }));

    // Daily revenue last 7 days
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyRevenue = await prisma.booking.findMany({
      where: { status: 'CONFIRMED', createdAt: { gte: sevenDaysAgo } },
      select: { totalAmount: true, createdAt: true },
    });
    const dailyMap: Record<string, number> = {};
    dailyRevenue.forEach(b => {
      const day = b.createdAt.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + Number(b.totalAmount);
    });

    return {
      totalMovies, nowShowing, totalBookings, totalUsers,
      totalRevenue: Number(revenue._sum.totalAmount || 0),
      recentBookings, topMovies: topMoviesList, dailyRevenue: dailyMap,
    };
  }
}

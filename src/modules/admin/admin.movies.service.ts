import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { MOCK_MOVIES } from '../movies/movies.service.js';
import { BookingsService } from '../bookings/bookings.service.js';

export class AdminMoviesService {
  static async listMovies() {
    try {
      const movies = await prisma.movie.findMany({ orderBy: { releaseDate: 'desc' } });
      if (movies && movies.length > 0) return movies;
    } catch (e) {
      // DB fallback
    }
    return MOCK_MOVIES;
  }

  static async createMovie(data: {
    title: string; synopsis: string; posterUrl: string; bannerUrl?: string; trailerUrl?: string;
    genre: string[]; language: string; format: string[]; runtimeMins: number;
    rating: string; cast: { name: string; role: string; photoUrl: string }[];
    director?: string; releaseDate: string; isShowing: boolean;
  }) {
    try {
      return await prisma.movie.create({
        data: { ...data, releaseDate: new Date(data.releaseDate), cast: data.cast as any },
      });
    } catch (e) {
      const newMovie = {
        id: `mov_${Date.now()}`,
        ...data,
        releaseDate: new Date(data.releaseDate),
        createdAt: new Date(),
      };
      MOCK_MOVIES.unshift(newMovie as any);
      return newMovie;
    }
  }

  static async updateMovie(id: string, data: Partial<{
    title: string; synopsis: string; posterUrl: string; bannerUrl: string; trailerUrl: string;
    genre: string[]; language: string; format: string[]; runtimeMins: number;
    rating: string; cast: { name: string; role: string; photoUrl: string }[];
    director: string; releaseDate: string; isShowing: boolean;
  }>) {
    try {
      const movie = await prisma.movie.findUnique({ where: { id } });
      if (movie) {
        const upd: any = { ...data };
        if (data.releaseDate) upd.releaseDate = new Date(data.releaseDate);
        if (data.cast) upd.cast = data.cast as any;
        return await prisma.movie.update({ where: { id }, data: upd });
      }
    } catch (e) {
      // Fallback
    }

    const mock = MOCK_MOVIES.find((m) => m.id === id);
    if (mock) {
      Object.assign(mock, data);
      if (data.releaseDate) mock.releaseDate = new Date(data.releaseDate);
      return mock;
    }

    throw new AppError('Movie not found', 404);
  }

  static async toggleShowing(id: string) {
    try {
      const movie = await prisma.movie.findUnique({ where: { id } });
      if (movie) {
        return await prisma.movie.update({ where: { id }, data: { isShowing: !movie.isShowing } });
      }
    } catch (e) {
      // Fallback
    }

    const mock = MOCK_MOVIES.find((m) => m.id === id);
    if (mock) {
      mock.isShowing = !mock.isShowing;
      return mock;
    }

    throw new AppError('Movie not found', 404);
  }

  static async deleteMovie(id: string) {
    try {
      const movie = await prisma.movie.findUnique({ where: { id } });
      if (movie) {
        await prisma.movie.delete({ where: { id } });
        return { message: 'Movie deleted' };
      }
    } catch (e) {
      // Fallback
    }

    const idx = MOCK_MOVIES.findIndex((m) => m.id === id);
    if (idx !== -1) {
      MOCK_MOVIES.splice(idx, 1);
      return { message: 'Movie deleted' };
    }

    throw new AppError('Movie not found', 404);
  }

  static async getStats() {
    let dbMovies: any[] = [];
    let dbBookings: any[] = [];
    let dbUserCount = 0;

    try {
      const [m, b, u] = await Promise.all([
        prisma.movie.findMany(),
        prisma.booking.findMany({
          include: {
            user: { select: { name: true, email: true } },
            showtime: { include: { movie: { select: { id: true, title: true, posterUrl: true } } } },
          },
        }),
        prisma.user.count(),
      ]);
      dbMovies = m;
      dbBookings = b;
      dbUserCount = u;
    } catch (e) {
      // DB fallback
    }

    const moviesList = dbMovies.length > 0 ? dbMovies : MOCK_MOVIES;
    const totalMovies = moviesList.length;
    const nowShowing = moviesList.filter((m: any) => m.isShowing).length;

    const memoryMap = BookingsService.getMemoryBookings();
    const memoryList = Array.from(memoryMap.values()).map((b: any) => ({
      ...b,
      user: b.user || { name: 'Demo Customer', email: 'customer@cinebook.np' },
    }));

    const existingIds = new Set(dbBookings.map((b) => b.id));
    const allBookings = [...dbBookings];
    for (const mb of memoryList) {
      if (!existingIds.has(mb.id)) {
        allBookings.push(mb);
      }
    }

    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalBookings = allBookings.length;
    const totalUsers = Math.max(dbUserCount, 12 + totalBookings);

    const confirmedBookings = allBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    const recentBookings = allBookings.slice(0, 5);

    const movieBookings: Record<string, { title: string; posterUrl: string; count: number }> = {};
    allBookings.forEach((b) => {
      const movie = b.showtime?.movie;
      if (movie) {
        const mid = movie.id || movie.title;
        if (!movieBookings[mid]) {
          movieBookings[mid] = { title: movie.title, posterUrl: movie.posterUrl || '', count: 0 };
        }
        movieBookings[mid].count += 1;
      }
    });

    const topMoviesList = Object.entries(movieBookings)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, v]) => ({ id, ...v }));

    const dailyMap: Record<string, number> = {};
    confirmedBookings.forEach((b) => {
      const day = new Date(b.createdAt).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] || 0) + Number(b.totalAmount || 0);
    });

    return {
      totalMovies,
      nowShowing,
      totalBookings,
      totalUsers,
      totalRevenue,
      recentBookings,
      topMovies: topMoviesList,
      dailyRevenue: dailyMap,
    };
  }
}

import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { isLocalEnv } from '../../lib/envMode.js';
import { generateMockShowtimes, MOCK_HALLS } from './showtimes.mock.js';

export class ShowtimesService {
  static async getShowtimes(
    movieId?: string,
    date?: string,
    locationId?: string,
    cinemaId?: string,
  ) {
    const where: any = {};
    if (movieId) where.movieId = movieId;
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59.999`);
      where.startsAt = { gte: startOfDay, lte: endOfDay };
    }
    if (cinemaId) {
      where.hall = { ...(where.hall ?? {}), cinemaId };
    }
    if (locationId) {
      where.hall = {
        ...(where.hall ?? {}),
        cinema: { locationId },
      };
    }

    try {
      const showtimes = await prisma.showtime.findMany({
        where,
        include: {
          hall: {
            include: {
              cinema: { include: { location: true } },
            },
          },
          movie: true,
        },
        orderBy: { startsAt: 'asc' },
      });

      // Always filter out showtimes that have already started (with 10-min buffer)
      const now = new Date();
      const cutoff = new Date(now.getTime() - 10 * 60 * 1000);
      return showtimes.filter((st) => new Date(st.startsAt) > cutoff);
    } catch (e) {
      if (isLocalEnv()) {
        const mock = generateMockShowtimes(movieId, date);
        // Filter out past/expired slots — real cinemas never show past showtimes
        const now = new Date();
        const cutoff = new Date(now.getTime() - 10 * 60 * 1000);
        return mock.filter((st) => new Date(st.startsAt) > cutoff);
      }
      throw new AppError('Unable to load showtimes. Database is unavailable.', 503);
    }
  }

  static async getHallById(id: string) {
    try {
      const hall = await prisma.hall.findUnique({
        where: { id },
        include: { seats: true, cinema: { include: { location: true } } },
      });
      if (hall) return hall;
    } catch (e) {
      if (!isLocalEnv()) {
        throw new AppError('Unable to load hall. Database is unavailable.', 503);
      }
    }

    if (isLocalEnv()) {
      return MOCK_HALLS.find((h) => h.id === id) || MOCK_HALLS[0];
    }

    throw new AppError('Hall not found', 404);
  }
}


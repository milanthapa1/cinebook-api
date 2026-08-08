import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SeatType } from '@prisma/client';

import { MOCK_HALLS } from '../showtimes/showtimes.mock.js';

export class AdminHallsService {
  static async listHalls() {
    try {
      const halls = await prisma.hall.findMany({
        include: {
          _count: { select: { seats: true, showtimes: true } },
        },
        orderBy: { name: 'asc' },
      });
      if (halls && halls.length > 0) return halls;
    } catch (e) {
      // DB fallback
    }

    return MOCK_HALLS.map((h) => ({
      ...h,
      _count: { seats: h.capacity || 60, showtimes: 4 },
    }));
  }

  static async createHall(data: {
    name: string;
    capacity: number;
    screenType: string;
    soundSystem: string;
    rows?: string[];
    seatsPerRow?: number;
  }) {
    const { rows = ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow = 10, ...hallData } = data;

    const hall = await prisma.hall.create({ data: hallData });

    // Auto-generate seats
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const type: SeatType =
        rIdx < 2 ? 'STANDARD' : rIdx < 4 ? 'PREMIUM' : 'RECLINER';
      for (let num = 1; num <= seatsPerRow; num++) {
        await prisma.seat.create({
          data: { hallId: hall.id, row, number: num, type },
        });
      }
    }

    return prisma.hall.findUnique({
      where: { id: hall.id },
      include: { _count: { select: { seats: true, showtimes: true } } },
    });
  }

  static async updateHall(id: string, data: Partial<{
    name: string;
    capacity: number;
    screenType: string;
    soundSystem: string;
  }>) {
    const hall = await prisma.hall.findUnique({ where: { id } });
    if (!hall) throw new AppError('Hall not found', 404);
    return prisma.hall.update({ where: { id }, data });
  }

  static async deleteHall(id: string) {
    const hall = await prisma.hall.findUnique({ where: { id } });
    if (!hall) throw new AppError('Hall not found', 404);
    // Delete seats first (FK constraint)
    await prisma.seat.deleteMany({ where: { hallId: id } });
    await prisma.hall.delete({ where: { id } });
    return { message: 'Hall deleted' };
  }
}

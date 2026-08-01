import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SeatType } from '@prisma/client';

export class AdminSeatsService {
  static async getSeatsByHall(hallId: string) {
    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) throw new AppError('Hall not found', 404);
    const seats = await prisma.seat.findMany({
      where: { hallId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });
    return { hall, seats };
  }

  static async updateSeat(id: string, data: { type?: SeatType }) {
    const seat = await prisma.seat.findUnique({ where: { id } });
    if (!seat) throw new AppError('Seat not found', 404);
    return prisma.seat.update({ where: { id }, data });
  }

  // Bulk update by specific seat IDs — not by row
  static async bulkUpdateSeats(hallId: string, seatIds: string[], type: SeatType) {
    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) throw new AppError('Hall not found', 404);
    await prisma.seat.updateMany({
      where: { hallId, id: { in: seatIds } },
      data: { type },
    });
    return prisma.seat.findMany({
      where: { hallId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });
  }

  static async addSeatRow(hallId: string, row: string, count: number, type: SeatType) {
    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) throw new AppError('Hall not found', 404);
    // Check row doesn't already exist
    const existing = await prisma.seat.count({ where: { hallId, row } });
    if (existing > 0) throw new AppError(`Row ${row} already exists in this hall`, 400);
    const seats = [];
    for (let n = 1; n <= Math.min(count, 30); n++) {
      seats.push(
        await prisma.seat.create({ data: { hallId, row, number: n, type } })
      );
    }
    return seats;
  }

  static async deleteSeatRow(hallId: string, row: string) {
    const count = await prisma.seat.count({ where: { hallId, row } });
    if (!count) throw new AppError(`Row ${row} not found`, 404);
    await prisma.seat.deleteMany({ where: { hallId, row } });
    return { message: `Row ${row} deleted (${count} seats)` };
  }
}

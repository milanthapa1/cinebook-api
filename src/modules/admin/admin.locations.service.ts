import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';

export class AdminLocationsService {

  // ── Locations ────────────────────────────────────────────────────────────
  static async listLocations() {
    return prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { cinemas: true } },
        cinemas: {
          include: {
            _count: { select: { halls: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  static async createLocation(data: { name: string; isActive?: boolean }) {
    const existing = await prisma.location.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(`Location "${data.name}" already exists`, 400);
    return prisma.location.create({
      data: { name: data.name, isActive: data.isActive ?? true },
      include: { _count: { select: { cinemas: true } }, cinemas: true },
    });
  }

  static async updateLocation(id: string, data: { name?: string; isActive?: boolean }) {
    const loc = await prisma.location.findUnique({ where: { id } });
    if (!loc) throw new AppError('Location not found', 404);
    return prisma.location.update({
      where: { id },
      data,
      include: { _count: { select: { cinemas: true } }, cinemas: true },
    });
  }

  static async deleteLocation(id: string) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { cinemas: true } } },
    });
    if (!loc) throw new AppError('Location not found', 404);
    if (loc._count.cinemas > 0)
      throw new AppError(`Cannot delete — ${loc._count.cinemas} cinema(s) exist in this location. Remove them first.`, 400);
    await prisma.location.delete({ where: { id } });
    return { message: `Location "${loc.name}" deleted` };
  }

  // ── Cinemas ───────────────────────────────────────────────────────────────
  static async listCinemas(locationId?: string) {
    return prisma.cinema.findMany({
      where: locationId ? { locationId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        location: { select: { id: true, name: true } },
        halls: {
          select: { id: true, name: true, capacity: true, screenType: true, _count: { select: { seats: true } } },
        },
        _count: { select: { halls: true } },
      },
    });
  }

  static async createCinema(data: {
    name: string;
    locationId: string;
    address?: string;
    phone?: string;
    mapUrl?: string;
    isActive?: boolean;
  }) {
    const loc = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!loc) throw new AppError('Location not found', 404);
    return prisma.cinema.create({
      data: { ...data, isActive: data.isActive ?? true },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { halls: true } },
      },
    });
  }

  static async updateCinema(id: string, data: {
    name?: string;
    locationId?: string;
    address?: string;
    phone?: string;
    mapUrl?: string;
    isActive?: boolean;
  }) {
    const cinema = await prisma.cinema.findUnique({ where: { id } });
    if (!cinema) throw new AppError('Cinema not found', 404);
    if (data.locationId) {
      const loc = await prisma.location.findUnique({ where: { id: data.locationId } });
      if (!loc) throw new AppError('Location not found', 404);
    }
    return prisma.cinema.update({
      where: { id },
      data,
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { halls: true } },
      },
    });
  }

  static async deleteCinema(id: string) {
    const cinema = await prisma.cinema.findUnique({
      where: { id },
      include: { _count: { select: { halls: true } } },
    });
    if (!cinema) throw new AppError('Cinema not found', 404);
    if (cinema._count.halls > 0)
      throw new AppError(`Cannot delete — ${cinema._count.halls} hall(s) are assigned to this cinema. Reassign or delete them first.`, 400);
    await prisma.cinema.delete({ where: { id } });
    return { message: `Cinema "${cinema.name}" deleted` };
  }

  // Assign an existing hall to a cinema
  static async assignHallToCinema(hallId: string, cinemaId: string | null) {
    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall) throw new AppError('Hall not found', 404);
    if (cinemaId) {
      const cinema = await prisma.cinema.findUnique({ where: { id: cinemaId } });
      if (!cinema) throw new AppError('Cinema not found', 404);
    }
    return prisma.hall.update({ where: { id: hallId }, data: { cinemaId } });
  }

  // Public endpoint — returns all active locations with their cinemas (for the frontend location picker)
  static async getPublicLocations() {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        cinemas: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            halls: {
              select: { id: true, name: true, screenType: true, soundSystem: true },
            },
          },
        },
      },
    });
    return locations;
  }
}

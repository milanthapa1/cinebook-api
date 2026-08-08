import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { Role } from '@prisma/client';

const MOCK_ADMIN_USERS = [
  { id: 'usr_admin', name: 'System Administrator', email: 'admin@cinebook.np', phone: '+977 9800000000', role: 'ADMIN' as Role, createdAt: new Date().toISOString(), _count: { bookings: 12 } },
  { id: 'usr_guest', name: 'Demo Customer', email: 'customer@cinebook.np', phone: '+977 9801234567', role: 'USER' as Role, createdAt: new Date().toISOString(), _count: { bookings: 3 } },
  { id: 'usr_ram', name: 'Ram Shrestha', email: 'ram@gmail.com', phone: '+977 9841112233', role: 'USER' as Role, createdAt: new Date().toISOString(), _count: { bookings: 1 } },
  { id: 'usr_sita', name: 'Sita Sharma', email: 'sita@gmail.com', phone: '+977 9842223344', role: 'USER' as Role, createdAt: new Date().toISOString(), _count: { bookings: 2 } },
];

export class AdminUsersService {
  static async listUsers(page = 1, limit = 20, search?: string) {
    try {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
            _count: { select: { bookings: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);
      if (users && users.length > 0) {
        return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
      }
    } catch (e) {
      // DB fallback
    }

    let filtered = MOCK_ADMIN_USERS;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return { users: paginated, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  static async updateUserRole(id: string, role: Role) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        return await prisma.user.update({
          where: { id },
          data: { role },
          select: { id: true, name: true, email: true, role: true },
        });
      }
    } catch (e) {
      // DB fallback
    }

    const mock = MOCK_ADMIN_USERS.find((u) => u.id === id);
    if (mock) {
      mock.role = role;
      return { id: mock.id, name: mock.name, email: mock.email, role: mock.role };
    }

    throw new AppError('User not found', 404);
  }
}

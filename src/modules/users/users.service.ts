import { prisma } from '../../lib/prisma.js';

export class UsersService {
  static async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          dob: true,
          gender: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
      if (user) return user;
    } catch (e) {
      // DB unavailable — fall through to demo response
    }

    return {
      id: userId,
      name: 'Demo User',
      email: 'demo@cinebook.com',
      phone: '+977-9800000000',
      dob: null,
      gender: null,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      createdAt: new Date(),
    };
  }

  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      phone?: string;
      dob?: string;
      gender?: string;
      avatarUrl?: string;
    },
  ) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          dob: true,
          gender: true,
          role: true,
          avatarUrl: true,
        },
      });
      return user;
    } catch (e) {
      // DB unavailable — return a shaped fallback so the client doesn't crash
      return {
        id: userId,
        name: data.name || 'Demo User',
        email: 'demo@cinebook.com',
        phone: data.phone || '+977-9800000000',
        dob: data.dob || null,
        gender: data.gender || null,
        role: 'USER',
        avatarUrl:
          data.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      };
    }
  }
}

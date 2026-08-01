import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Singleton instance of PrismaClient
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

export default prisma;

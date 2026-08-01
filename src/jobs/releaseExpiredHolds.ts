import { prisma } from '../lib/prisma.js';
import { SeatsService } from '../modules/seats/seats.service.js';
import { isTestEnv } from '../lib/envMode.js';

export const releaseExpiredHolds = async () => {
  const now = new Date();

  try {
    const deleted = await prisma.seatHold.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
    if (deleted.count > 0) {
      console.log(`[Job]: Released ${deleted.count} expired seat holds from DB.`);
    }
  } catch (e) {
    if (isTestEnv()) {
      const memoryHolds = SeatsService.getMemoryHolds();
      let count = 0;
      for (const [key, hold] of memoryHolds.entries()) {
        if (new Date(hold.expiresAt) <= now) {
          memoryHolds.delete(key);
          count++;
        }
      }
      if (count > 0) {
        console.log(`[Job]: Released ${count} expired seat holds from memory store.`);
      }
    } else {
      console.error('[Job Error]: Failed to release expired holds from database', e);
    }
  }
};

export const startHoldCleanupInterval = (intervalMs: number = 60000) => {
  console.log(`[Job]: Starting expired seat hold cleanup background job (interval: ${intervalMs}ms)...`);
  setInterval(() => {
    releaseExpiredHolds().catch((err) => {
      console.error('[Job Error]: Failed to release expired holds', err);
    });
  }, intervalMs);
};

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';

describe('Concurrency & Seat Hold Race Condition Protection', () => {
  let user1Token: string;
  let user2Token: string;
  const user1Id = 'usr_concurrent_1';
  const user2Id = 'usr_concurrent_2';
  const showtimeId = 'st_mov_dune2_h1_d0_t10';
  const targetSeatId = 'seat_hall_1_C5';

  beforeAll(async () => {
    // Generate valid JWT tokens directly for speed
    const tokens1 = AuthService.generateTokens({ id: user1Id, email: 'user1@test.com', role: 'USER' });
    user1Token = tokens1.accessToken;

    const tokens2 = AuthService.generateTokens({ id: user2Id, email: 'user2@test.com', role: 'USER' });
    user2Token = tokens2.accessToken;
  });

  it('should allow User 1 to hold an available seat', async () => {
    const res = await request(app)
      .post('/api/v1/seat-holds')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showtimeId,
        seatIds: [targetSeatId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.holds.length).toBe(1);
  });

  it('should reject User 2 when trying to hold the exact same seat concurrently (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/seat-holds')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        showtimeId,
        seatIds: [targetSeatId],
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should handle simultaneous concurrent seat hold requests safely', async () => {
    const seatId = 'seat_hall_1_D4';

    // Fire 2 simultaneous requests for the exact same seat
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/seat-holds')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ showtimeId, seatIds: [seatId] }),
      request(app)
        .post('/api/v1/seat-holds')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ showtimeId, seatIds: [seatId] }),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });

  it('should convert valid seat hold into a PENDING booking', async () => {
    const seatId = 'seat_hall_1_A1';
    
    // Step 1: Hold seat
    await request(app)
      .post('/api/v1/seat-holds')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showtimeId, seatIds: [seatId] });

    // Step 2: Convert to booking
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showtimeId,
        seatIds: [seatId],
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    expect(bookingRes.body.data.status).toBe('PENDING');
    expect(bookingRes.body.data.qrPayload).toBeDefined();
  });
});

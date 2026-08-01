import { PrismaClient, SeatType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedLocationsAndCinemas } from './seedLocations.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CineBook database seeding...');

  // 1. Seed Demo User & Admin
  const hashedPassword = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cinebook.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@cinebook.com',
      phone: '+977-9800000000',
      passwordHash: hashedPassword,
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@cinebook.com' },
    update: {},
    create: {
      name: 'Cinema Manager',
      email: 'admin@cinebook.com',
      phone: '+977-9841000000',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
    },
  });

  // 2. Seed locations & cinemas, link demo halls
  const defaultCinemaId = await seedLocationsAndCinemas(prisma);

  // 3. Seed Halls & Seats
  const hallsData = [
    {
      id: 'hall_1',
      name: 'Audi 1 (IMAX Laser)',
      capacity: 60,
      screenType: '4K Dual Laser 3D',
      soundSystem: 'Dolby Atmos 12.1',
    },
    {
      id: 'hall_2',
      name: 'Audi 2 (Dolby Cinema)',
      capacity: 48,
      screenType: 'Laser Projection',
      soundSystem: 'Dolby Atmos',
    },
    {
      id: 'hall_3',
      name: 'Audi 3 (VIP Lounge)',
      capacity: 32,
      screenType: 'MicroLED HDR',
      soundSystem: 'Bowers & Wilkins Custom',
    },
  ];

  for (const hall of hallsData) {
    const createdHall = await prisma.hall.upsert({
      where: { id: hall.id },
      update: { cinemaId: defaultCinemaId ?? undefined },
      create: { ...hall, cinemaId: defaultCinemaId ?? undefined },
    });

    // Create seat layout for each hall (Rows A-F, Seats 1-10) — bulk insert for speed
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seatsToCreate: { hallId: string; row: string; number: number; type: SeatType }[] = [];
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const type: SeatType = rIdx < 2 ? 'STANDARD' : rIdx < 4 ? 'PREMIUM' : 'RECLINER';
      for (let num = 1; num <= 10; num++) {
        seatsToCreate.push({ hallId: createdHall.id, row, number: num, type });
      }
    }
    await prisma.seat.createMany({ data: seatsToCreate, skipDuplicates: true });
  }

  // 4. Seed Movies
  const movies = [
    {
      id: 'mov_dune2',
      title: 'Dune: Part Two',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
      trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
      genre: ['Sci-Fi', 'Adventure', 'Action'],
      language: 'English',
      format: ['2D', '3D', 'IMAX'],
      runtimeMins: 166,
      rating: 'PG-13',
      cast: [
        { name: 'Timothée Chalamet', role: 'Paul Atreides', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
        { name: 'Zendaya', role: 'Chani', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' }
      ],
      releaseDate: new Date('2026-03-01'),
      isShowing: true,
    },
    {
      id: 'mov_oppenheimer',
      title: 'Oppenheimer',
      synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
      posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800',
      trailerUrl: 'https://www.youtube.com/embed/uYPbbksJxIg',
      genre: ['Biography', 'Drama', 'History'],
      language: 'English',
      format: ['2D', 'IMAX'],
      runtimeMins: 180,
      rating: 'R',
      cast: [
        { name: 'Cillian Murphy', role: 'J. Robert Oppenheimer', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
        { name: 'Emily Blunt', role: 'Katherine Oppenheimer', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' }
      ],
      releaseDate: new Date('2026-02-15'),
      isShowing: true,
    },
    {
      id: 'mov_spiderverse',
      title: 'Spider-Man: Beyond the Spider-Verse',
      synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
      posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=800',
      trailerUrl: 'https://www.youtube.com/embed/cqGjhVJWtEg',
      genre: ['Animation', 'Action', 'Adventure'],
      language: 'English',
      format: ['2D', '3D'],
      runtimeMins: 140,
      rating: 'PG',
      cast: [
        { name: 'Shameik Moore', role: 'Miles Morales', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
        { name: 'Hailee Steinfeld', role: 'Gwen Stacy', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }
      ],
      releaseDate: new Date('2026-05-10'),
      isShowing: true,
    },
    {
      id: 'mov_shambhala',
      title: 'Shambhala',
      synopsis: 'A pregnant woman in a polyandrous Himalayan village embarks on a journey to find her missing husband.',
      posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800',
      trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
      genre: ['Drama', 'Mystery'],
      language: 'Nepali',
      format: ['2D'],
      runtimeMins: 150,
      rating: 'PG',
      cast: [
        { name: 'Thinley Lhamo', role: 'Pema', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }
      ],
      releaseDate: new Date('2026-04-12'),
      isShowing: true,
    },
    {
      id: 'mov_interstellar',
      title: 'Interstellar (10th Anniversary IMAX)',
      synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
      posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=800',
      trailerUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E',
      genre: ['Sci-Fi', 'Drama'],
      language: 'English',
      format: ['IMAX', '2D'],
      runtimeMins: 169,
      rating: 'PG-13',
      cast: [{ name: 'Matthew McConaughey', role: 'Cooper', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }],
      releaseDate: new Date('2026-01-10'),
      isShowing: true,
    }
  ];

  for (const m of movies) {
    await prisma.movie.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }

  // 5. Seed Showtimes for Next 7 Days — bulk insert for speed
  const today = new Date();
  const times = ['10:30', '14:00', '17:30', '21:00'];
  const showtimesToCreate: {
    id: string; movieId: string; hallId: string;
    startsAt: Date; basePrice: number; premiumPrice: number;
  }[] = [];

  for (let day = 0; day < 7; day++) {
    const showDate = new Date(today);
    showDate.setDate(today.getDate() + day);

    for (const m of movies.slice(0, 3)) {
      for (let hIdx = 0; hIdx < hallsData.length; hIdx++) {
        const timeStr = times[hIdx % times.length];
        const [hours, mins] = timeStr.split(':').map(Number);
        const startsAt = new Date(showDate);
        startsAt.setHours(hours, mins, 0, 0);
        showtimesToCreate.push({
          id: `st_${m.id}_h${hIdx + 1}_d${day}_t${hours}`,
          movieId: m.id,
          hallId: hallsData[hIdx].id,
          startsAt,
          basePrice: 450.00,
          premiumPrice: 650.00,
        });
      }
    }
  }

  await prisma.showtime.createMany({ data: showtimesToCreate, skipDuplicates: true });

  console.log('✅ CineBook database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

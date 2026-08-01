import { PrismaClient } from '@prisma/client';

const LOCATIONS = [
  {
    name: 'Kathmandu',
    cinemas: [
      { name: 'Civil Mall Cinemas (Sundhara)', address: 'Civil Mall, Sundhara, Kathmandu', phone: '+977-1-5970000' },
      { name: 'Rising Mall Cinemas (Durbar Marg)', address: 'Rising Mall, Durbar Marg, Kathmandu', phone: '+977-1-4228000' },
      { name: 'Chhaya Center Cinemas (Thamel)', address: 'Chhaya Center, Thamel, Kathmandu', phone: '+977-1-4700000' },
      { name: 'Durbar Cinemax (Durbar Marg)', address: 'Durbar Marg, Kathmandu', phone: '+977-1-4221000' },
    ],
  },
  {
    name: 'Lalitpur',
    cinemas: [
      { name: 'Labim Mall Cinemas (Pulchowk)', address: 'Labim Mall, Pulchowk, Lalitpur', phone: '+977-1-5540000' },
    ],
  },
  {
    name: 'Pokhara',
    cinemas: [
      { name: 'Pokhara Trade Mall Cinemas', address: 'Chipledhunga, Pokhara', phone: '+977-61-530000' },
      { name: 'Lakeside Cinema', address: 'Lakeside, Pokhara', phone: '+977-61-460000' },
    ],
  },
  {
    name: 'Butwal',
    cinemas: [
      { name: 'Milanchowk Multiplex', address: 'Milanchowk, Butwal', phone: '+977-71-540000' },
      { name: 'Butwal City Center Cinemas', address: 'Traffic Chowk, Butwal', phone: '+977-71-520000' },
    ],
  },
  {
    name: 'Biratnagar',
    cinemas: [
      { name: 'Bhatbhateni Biratnagar Cinemas', address: 'Main Road, Biratnagar', phone: '+977-21-470000' },
    ],
  },
  {
    name: 'Chitwan',
    cinemas: [
      { name: 'CG Landmark Mall Cinemas', address: 'Narayangarh, Chitwan', phone: '+977-56-520000' },
    ],
  },
];

function cinemaIdFor(locName: string, cinemaName: string) {
  return `cin_${locName.toLowerCase()}_${cinemaName.slice(0, 8).toLowerCase().replace(/\s/g, '_')}`;
}

/** Seed locations + cinemas; returns first Kathmandu cinema id when available. */
export async function seedLocationsAndCinemas(prisma: PrismaClient): Promise<string | null> {
  let firstKathmanduCinemaId: string | null = null;

  for (const loc of LOCATIONS) {
    const location = await prisma.location.upsert({
      where: { name: loc.name },
      update: {},
      create: { name: loc.name, isActive: true },
    });
    for (const cin of loc.cinemas) {
      const id = cinemaIdFor(loc.name, cin.name);
      if (loc.name === 'Kathmandu' && !firstKathmanduCinemaId) {
        firstKathmanduCinemaId = id;
      }
      await prisma.cinema.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: cin.name,
          address: cin.address,
          phone: cin.phone,
          locationId: location.id,
          isActive: true,
        },
      });
    }
  }

  return firstKathmanduCinemaId;
}

async function main() {
  const prisma = new PrismaClient();
  console.log('🌱 Seeding locations and cinemas...');
  await seedLocationsAndCinemas(prisma);
  console.log('✅ Locations seeded.');
  await prisma.$disconnect();
}

main().catch(console.error);

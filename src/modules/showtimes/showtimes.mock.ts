export const MOCK_HALLS = [
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

export const generateMockShowtimes = (movieId?: string, dateStr?: string) => {
  const baseDate = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const times = ['10:30 AM', '01:45 PM', '05:15 PM', '08:30 PM', '11:00 PM'];
  const showtimes: any[] = [];

  const targetMovies = movieId ? [movieId] : ['mov_dune2', 'mov_oppenheimer', 'mov_spiderverse', 'mov_shambhala'];

  let idCounter = 1;
  for (const mId of targetMovies) {
    for (let hIdx = 0; hIdx < MOCK_HALLS.length; hIdx++) {
      const hall = MOCK_HALLS[hIdx];
      for (const timeStr of times.slice(hIdx, hIdx + 3)) {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const startsAt = new Date(baseDate);
        startsAt.setHours(hours, minutes, 0, 0);

        showtimes.push({
          id: `st_${mId}_${hall.id}_${idCounter++}`,
          movieId: mId,
          hallId: hall.id,
          startsAt,
          basePrice: 450.0,
          premiumPrice: 650.0,
          hall,
        });
      }
    }
  }

  return showtimes;
};

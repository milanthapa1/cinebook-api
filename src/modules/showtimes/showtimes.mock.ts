import { MOCK_MOVIES } from '../movies/movies.service.js';

export const MOCK_HALLS = [
  {
    id: 'hall_1',
    name: 'Audi 1',
    capacity: 60,
    screenType: 'IMAX Laser',
    soundSystem: 'Dolby Atmos 12.1',
  },
  {
    id: 'hall_2',
    name: 'Audi 2',
    capacity: 48,
    screenType: 'Dolby Cinema',
    soundSystem: 'Dolby Atmos',
  },
  {
    id: 'hall_3',
    name: 'Audi 3',
    capacity: 32,
    screenType: 'VIP Lounge',
    soundSystem: 'Bowers & Wilkins Custom',
  },
];

export const generateMockShowtimes = (movieId?: string, dateStr?: string) => {
  const baseDate = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  // 5 distinct daily time slots per hall. A real cinema never runs two movies
  // in the same hall at the same time, so we rotate by (movieIndex * 2) mod 5
  // to give every movie a unique, non-overlapping slot per hall.
  const allTimes = ['10:30 AM', '01:45 PM', '05:15 PM', '08:30 PM', '11:00 PM'];
  const showtimes: any[] = [];

  const allMovies = MOCK_MOVIES;
  const targetMovieIds = movieId ? [movieId] : allMovies.map((m) => m.id);

  for (const mId of targetMovieIds) {
    const movieGlobalIdx = allMovies.findIndex((m) => m.id === mId);
    const mIdx = movieGlobalIdx >= 0 ? movieGlobalIdx : 0;

    for (let hIdx = 0; hIdx < MOCK_HALLS.length; hIdx++) {
      const hall = MOCK_HALLS[hIdx];
      // Rotate starting time index by movieIndex*2 + hallIndex to guarantee uniqueness
      const startOffset = ((mIdx * 2) + hIdx) % allTimes.length;
      // Each movie+hall pair gets up to 2 time slots (avoiding overlap)
      const sliceTimes = [allTimes[startOffset], allTimes[(startOffset + 3) % allTimes.length]];

      for (let tIdx = 0; tIdx < sliceTimes.length; tIdx++) {
        const timeStr = sliceTimes[tIdx];
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const startsAt = new Date(baseDate);
        startsAt.setHours(hours, minutes, 0, 0);

        showtimes.push({
          id: `st_${mId}_${hall.id}_${hIdx}_${tIdx}`,
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


function extractMovieTitleFromShowtimeId(showtimeId: string): string {
  const clean = showtimeId.replace(/^st_/, '').split('_hall_')[0].replace(/^mov_/, '');
  if (!clean || /^c[a-z0-9]{15,}$/i.test(clean) || /^[a-z0-9]{20,}$/i.test(clean)) {
    return MOCK_MOVIES[0]?.title || 'Into the Wild';
  }
  return clean
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const getMockShowtimeById = (showtimeId: string) => {
  const allMockShowtimes = generateMockShowtimes();
  const found = allMockShowtimes.find((st) => st.id === showtimeId);

  if (found) {
    const movie = MOCK_MOVIES.find((m) => m.id === found.movieId) || MOCK_MOVIES[0];
    return {
      id: found.id,
      startsAt: found.startsAt,
      movie: {
        title: movie.title,
        posterUrl: movie.posterUrl,
        format: movie.format,
        language: movie.language,
        rating: movie.rating,
        runtimeMins: movie.runtimeMins,
      },
      hall: {
        name: found.hall.name,
        screenType: found.hall.screenType,
        soundSystem: found.hall.soundSystem,
      },
    };
  }

  // Extract movie ID if embedded in showtime ID string (e.g. st_mov_intothewild_hall_1_0)
  const lowerId = showtimeId.toLowerCase();
  let matchedMovie = MOCK_MOVIES.find((m) => lowerId.includes(m.id.toLowerCase()));

  if (!matchedMovie) {
    for (const m of MOCK_MOVIES) {
      const cleanTitle = m.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanTitle.length >= 3 && lowerId.replace(/[^a-z0-9]/g, '').includes(cleanTitle)) {
        matchedMovie = m;
        break;
      }
    }
  }

  const rawTitle = matchedMovie ? matchedMovie.title : extractMovieTitleFromShowtimeId(showtimeId);
  const isCuid = /^c[a-z0-9]{15,}$/i.test(rawTitle) || /^[a-z0-9]{20,}$/i.test(rawTitle);
  const finalTitle = isCuid ? (MOCK_MOVIES.find(m => m.id === 'mov_intothewild')?.title || MOCK_MOVIES[0].title) : rawTitle;

  const finalMovie = matchedMovie || {
    id: 'mov_dynamic',
    title: finalTitle,
    posterUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=800',
    format: ['IMAX 2D', 'DOLBY ATMOS'],
    language: 'English',
    rating: 'PG-13',
    runtimeMins: 145,
  };

  const matchedHall = MOCK_HALLS.find((h) => showtimeId.includes(h.id)) || MOCK_HALLS[0];

  return {
    id: showtimeId,
    startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    movie: {
      title: finalTitle,
      posterUrl: finalMovie.posterUrl,
      format: finalMovie.format,
      language: finalMovie.language,
      rating: finalMovie.rating,
      runtimeMins: finalMovie.runtimeMins,
    },
    hall: {
      name: matchedHall.name,
      screenType: matchedHall.screenType,
      soundSystem: matchedHall.soundSystem,
    },
  };
};





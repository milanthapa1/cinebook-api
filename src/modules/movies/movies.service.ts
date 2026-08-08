import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { isLocalEnv } from '../../lib/envMode.js';

export const MOCK_MOVIES = [
  {
    id: 'mov_intothewild',
    title: 'Into the Wild',
    synopsis: 'An inspiring adventure of a young man who leaves society behind to embark on a solitary journey into the Alaskan wilderness.',
    posterUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/g7ArZ7VD-y0',
    genre: ['Adventure', 'Biography', 'Drama'],
    language: 'English',
    format: ['IMAX 2D', '4K LASER'],
    runtimeMins: 148,
    rating: 'PG-13',
    cast: [
      { name: 'Emile Hirsch', role: 'Christopher McCandless', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
      { name: 'Marcia Gay Harden', role: 'Billie McCandless', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
    ],
    releaseDate: new Date('2026-08-01'),
    isShowing: true,
    createdAt: new Date(),
  },
  {
    id: 'mov_spiderverse',
    title: 'Spider-Man: Brand New Day',
    synopsis: 'Peter Parker tries to focus on college and leave Spider-Man behind. But when a new threat endangers his friends, he must break his oath and swing back into action.',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/cqGjhVJWtEg',
    genre: ['Fantasy', 'Action', 'Adventure'],
    language: 'English',
    format: ['IMAX 3D', '4K LASER'],
    runtimeMins: 146,
    rating: 'PG',
    cast: [
      { name: 'Tom Holland', role: 'Peter Parker / Spider-Man', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
      { name: 'Zendaya', role: 'MJ', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
    ],
    releaseDate: new Date('2026-07-30'),
    isShowing: true,
    createdAt: new Date(),
  },
  {
    id: 'mov_gauthali',
    title: 'Gauthali',
    synopsis: 'A touching story set in the lush hills of Western Nepal following a young woman fighting against traditional boundaries to preserve her family lineage.',
    posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
    genre: ['Social Drama', 'Family'],
    language: 'Nepali',
    format: ['2D LASER'],
    runtimeMins: 135,
    rating: 'PG',
    cast: [
      { name: 'Thinley Lhamo', role: 'Gauthali', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
      { name: 'Dayahang Rai', role: 'Bir Bahadur', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
    ],
    releaseDate: new Date('2026-07-17'),
    isShowing: true,
    createdAt: new Date(),
  },
  {
    id: 'mov_odyssey',
    title: 'The Odyssey',
    synopsis: 'An epic cinematic journey charting Odysseus 10-year struggle to return home after the Trojan War against mythical beasts and vengeful gods.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
    genre: ['Action', 'Adventure', 'Fantasy'],
    language: 'English',
    format: ['IMAX 2D', 'DOLBY ATMOS'],
    runtimeMins: 165,
    rating: 'PG-13',
    cast: [
      { name: 'Cillian Murphy', role: 'Odysseus', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
    ],
    releaseDate: new Date('2026-07-17'),
    isShowing: true,
    createdAt: new Date(),
  },
  {
    id: 'mov_dhamaal4',
    title: 'Dhamaal 4',
    synopsis: 'The hilarious group of friends reunite for another madcap wild treasure hunt filled with hilarious misunderstandings and non-stop comedy chaos.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/uYPbbksJxIg',
    genre: ['Comedy', 'Drama'],
    language: 'Hindi',
    format: ['2D LASER'],
    runtimeMins: 142,
    rating: 'PG',
    cast: [
      { name: 'Ajay Devgn', role: 'Goploo', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
    ],
    releaseDate: new Date('2026-07-10'),
    isShowing: true,
    createdAt: new Date(),
  },
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
    createdAt: new Date(),
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
      { name: 'Cillian Murphy', role: 'J. Robert Oppenheimer', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
    ],
    releaseDate: new Date('2026-02-15'),
    isShowing: true,
    createdAt: new Date(),
  },
  {
    id: 'mov_avatar3',
    title: 'Avatar: Fire and Ash',
    synopsis: 'Jake Sully and Neytiri travel across Pandora encountering new ash tribes and terrifying enemies.',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/embed/d9MyW72ELq0',
    genre: ['Sci-Fi', 'Action', 'Fantasy'],
    language: 'English',
    format: ['3D', 'IMAX'],
    runtimeMins: 190,
    rating: 'PG-13',
    cast: [
      { name: 'Sam Worthington', role: 'Jake Sully', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
    ],
    releaseDate: new Date('2026-12-18'),
    isShowing: false,
    createdAt: new Date(),
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
    createdAt: new Date(),
  }
];

export class MoviesService {
  static async getMovies(query: {
    genre?: string;
    language?: string;
    format?: string;
    search?: string;
    isShowing?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const where: any = {};
      if (query.genre) where.genre = { has: query.genre };
      if (query.language) where.language = query.language;
      if (query.format) where.format = { has: query.format };
      if (query.isShowing !== undefined) where.isShowing = query.isShowing === 'true';
      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { synopsis: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const movies = await prisma.movie.findMany({
        where,
        orderBy: { releaseDate: 'desc' },
      });

      return movies;
    } catch (error) {
      if (isLocalEnv()) {
        let filtered = [...MOCK_MOVIES];
        if (query.search) {
          const q = query.search.toLowerCase();
          filtered = filtered.filter((m) => m.title.toLowerCase().includes(q) || m.genre.some((g) => g.toLowerCase().includes(q)));
        }
        if (query.genre) {
          filtered = filtered.filter((m) => m.genre.includes(query.genre!));
        }
        if (query.language) {
          filtered = filtered.filter((m) => m.language === query.language);
        }
        if (query.format) {
          filtered = filtered.filter((m) => m.format.includes(query.format!));
        }
        if (query.isShowing !== undefined) {
          const showing = query.isShowing === 'true';
          filtered = filtered.filter((m) => m.isShowing === showing);
        }
        return filtered;
      }
      throw new AppError('Unable to load movies. Database is unavailable.', 503);
    }
  }

  static async getMovieById(id: string) {
    try {
      const movie = await prisma.movie.findUnique({
        where: { id },
        include: {
          showtimes: {
            include: { hall: true },
          },
        },
      });
      if (movie) return movie;
      return null;
    } catch (e) {
      if (isLocalEnv()) {
        const mock = MOCK_MOVIES.find((m) => m.id === id);
        return mock ?? null;
      }
      throw new AppError('Unable to load movie. Database is unavailable.', 503);
    }
  }
}


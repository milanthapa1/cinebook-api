import { Request, Response, NextFunction } from 'express';
import { MoviesService } from './movies.service.js';

export class MoviesController {
  static async getMovies(req: Request, res: Response, next: NextFunction) {
    try {
      const { genre, language, format, search, isShowing, page, limit } = req.query;
      const movies = await MoviesService.getMovies({
        genre: genre as string,
        language: language as string,
        format: format as string,
        search: search as string,
        isShowing: isShowing as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: movies,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMovieById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const movie = await MoviesService.getMovieById(id);

      if (!movie) {
        return res.status(404).json({ success: false, message: 'Movie not found' });
      }

      res.status(200).json({
        success: true,
        data: movie,
      });
    } catch (error) {
      next(error);
    }
  }
}

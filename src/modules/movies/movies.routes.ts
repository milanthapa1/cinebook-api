import { Router } from 'express';
import { MoviesController } from './movies.controller.js';

const router = Router();

router.get('/', MoviesController.getMovies);
router.get('/:id', MoviesController.getMovieById);

export default router;

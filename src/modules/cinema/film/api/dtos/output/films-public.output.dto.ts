import {
  MoviePublicOutputDto,
  MoviePublicOutputDtoMapper,
  MoviesPublicOutputDto,
} from '@/movies/api/dtos/output/movie-public.output.dto';
import { Injectable } from '@nestjs/common';

export class FilmsPublicOutputDto extends MoviesPublicOutputDto {}

export class FilmPublicOutputDto extends MoviePublicOutputDto {}

@Injectable()
export class FilmsPublicOutputDtoMapper extends MoviePublicOutputDtoMapper {}

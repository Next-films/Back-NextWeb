import {
  MoviePublicOutputDto,
  MoviePublicOutputDtoMapper,
  MoviesPublicOutputDto,
} from '@/movies/api/dtos/output/movie-public.output.dto';
import { Injectable } from '@nestjs/common';

export class CartoonsPublicOutputDto extends MoviesPublicOutputDto {}

export class CartoonPublicOutputDto extends MoviePublicOutputDto {}

@Injectable()
export class CartoonsPublicOutputDtoMapper extends MoviePublicOutputDtoMapper {}

import { Injectable } from '@nestjs/common';
import {
  MoviePrivateOutputDto,
  MoviePrivateOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-private.output.dto';

export class FilmPrivateOutputDto extends MoviePrivateOutputDto {}

@Injectable()
export class FilmsPrivateOutputDtoMapper extends MoviePrivateOutputDtoMapper {}

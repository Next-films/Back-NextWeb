import { Injectable } from '@nestjs/common';
import {
  MoviePrivateOutputDto,
  MoviePrivateOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-private.output.dto';

export class CartoonsPrivateOutputDto extends MoviePrivateOutputDto {}

@Injectable()
export class CartoonsPrivateOutputDtoMapper extends MoviePrivateOutputDtoMapper {}

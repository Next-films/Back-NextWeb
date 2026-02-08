import { Injectable } from '@nestjs/common';
import {
  MoviePrivateOutputDto,
  MoviePrivateOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-private.output.dto';

export class SerialPrivateOutputDto extends MoviePrivateOutputDto {}

@Injectable()
export class SerialsPrivateOutputDtoMapper extends MoviePrivateOutputDtoMapper {}

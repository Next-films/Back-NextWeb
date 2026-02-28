import { Injectable } from '@nestjs/common';
import {
  MovieRpcOutputDto,
  MovieRpcOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-rpc.output.dto';

export class SerialsRpcOutputDto extends MovieRpcOutputDto {}

@Injectable()
export class SerialsRpcOutputDtoMapper extends MovieRpcOutputDtoMapper {}

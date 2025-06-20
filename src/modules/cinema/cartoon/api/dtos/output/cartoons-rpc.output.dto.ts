import { Injectable } from '@nestjs/common';
import {
  MovieRpcOutputDto,
  MovieRpcOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-rpc.output.dto';

export class CartoonsRpcOutputDto extends MovieRpcOutputDto {}

@Injectable()
export class CartoonsRpcOutputDtoMapper extends MovieRpcOutputDtoMapper {}

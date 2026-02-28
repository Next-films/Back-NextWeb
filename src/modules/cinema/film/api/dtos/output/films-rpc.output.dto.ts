import { Injectable } from '@nestjs/common';
import {
  MovieRpcOutputDto,
  MovieRpcOutputDtoMapper,
} from '@/movies/api/dtos/output/movie-rpc.output.dto';

export class FilmsRpcOutputDto extends MovieRpcOutputDto {}

@Injectable()
export class FilmsRpcOutputDtoMapper extends MovieRpcOutputDtoMapper {}

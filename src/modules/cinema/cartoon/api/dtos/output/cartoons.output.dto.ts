import { MovieOutputDto, MovieOutputDtoMapper } from '@/movies/api/dtos/output/movie.output.dto';
import { Injectable } from '@nestjs/common';

export class CartoonsOutputDto extends MovieOutputDto {}

@Injectable()
export class CartoonsOutputDtoMapper extends MovieOutputDtoMapper {}

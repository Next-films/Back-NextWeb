import { MovieOutputDto, MovieOutputDtoMapper } from '@/movies/api/dtos/output/movie.output.dto';
import { Injectable } from '@nestjs/common';

export class FilmsOutputDto extends MovieOutputDto {}

@Injectable()
export class FilmsOutputDtoMapper extends MovieOutputDtoMapper {}

import { Injectable } from '@nestjs/common';
import {
  AdminCinemaMoviesOutputDto,
  AdminCinemaMoviesOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-movies.output.dto';

export class AdminCinemaCartoonsOutputDto extends AdminCinemaMoviesOutputDto {}

@Injectable()
export class AdminCinemaCartoonsOutputDtoMapper extends AdminCinemaMoviesOutputDtoMapper {}

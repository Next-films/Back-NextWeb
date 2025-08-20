import { Injectable } from '@nestjs/common';
import {
  AdminCinemaMoviesOutputDto,
  AdminCinemaMoviesOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-movies.output.dto';

export class AdminCinemaFilmsOutputDto extends AdminCinemaMoviesOutputDto {}

@Injectable()
export class AdminCinemaFilmsOutputDtoMapper extends AdminCinemaMoviesOutputDtoMapper {}

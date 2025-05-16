import { Controller, Get, Param } from '@nestjs/common';
import { FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';

//TODO:
@ApiTags('Public - films')
@Controller(FILMS_ROUTE.MAIN)
export class FilmController {
  constructor() {}

  @Get()
  async getAllFilms(): Promise<any> {}

  @Get(`:filmId`)
  async getFilmById(@Param('filmId', ParseIntPatchPipe) filmId: number): Promise<any> {}
}

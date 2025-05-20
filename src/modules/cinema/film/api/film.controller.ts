import { Controller, Get, Param, Query } from '@nestjs/common';
import { FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';
import { GetFilmByIdQuery } from '@/films/application/query-handlers/get-film-by-id.query-handler';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GetFilmsQuery } from '@/films/application/query-handlers/get-films.query-handler';
import { GetFilmsInputQuery } from '@/films/api/dtos/input/get-films.input-query';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { SwaggerDecoratorGetFilms } from '@/films/api/swagger/get-films.swagger.decorator';
import { SwaggerDecoratorGetFilmById } from '@/films/api/swagger/get-film-by-id.swagger.decorator';

@ApiTags('Public - films')
@Controller(FILMS_ROUTE.MAIN)
export class FilmController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(FilmController.name);
  }

  @Get()
  @SwaggerDecoratorGetFilms()
  async getAllFilms(
    @Query() query: GetFilmsInputQuery,
  ): Promise<PaginationUtil<FilmsOutputDto[]> | void> {
    this.logger.log(`Execute: Get films`, this.getAllFilms.name);

    const result = await this.queryBus.execute<
      GetFilmsQuery,
      AppNotificationResult<PaginationUtil<FilmsOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new GetFilmsQuery(query));

    this.logger.log(result.appResult, this.getAllFilms.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(`:filmId`)
  @SwaggerDecoratorGetFilmById()
  async getFilmById(
    @Param('filmId', ParseIntPatchPipe) filmId: number,
  ): Promise<FilmsOutputDto | void> {
    this.logger.log(`Execute: Get film by id: ${filmId}`, this.getFilmById.name);

    const result = await this.queryBus.execute<
      GetFilmByIdQuery,
      AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetFilmByIdQuery(filmId));

    this.logger.log(result.appResult, this.getFilmById.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

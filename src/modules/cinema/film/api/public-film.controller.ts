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
import {
  FilmPublicOutputDto,
  FilmsPublicOutputDto,
} from '@/films/api/dtos/output/films-public.output.dto';
import { GetPublicFilmByIdQuery } from '@/films/application/query-handlers/get-public-film-by-id.query-handler';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GetPublicFilmsQuery } from '@/films/application/query-handlers/get-public-films.query-handler';
import { GetFilmsInputQuery } from '@/films/api/dtos/input/get-films.input-query';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { SwaggerDecoratorGetPublicFilms } from '@/films/api/swagger/get-public-films.swagger.decorator';
import { SwaggerDecoratorGetPublicFilmById } from '@/films/api/swagger/get-public-film-by-id.swagger.decorator';

@ApiTags('Public - films')
@Controller(FILMS_ROUTE.MAIN)
export class PublicFilmController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(PublicFilmController.name);
  }

  @Get()
  @SwaggerDecoratorGetPublicFilms()
  async getAllFilms(
    @Query() query: GetFilmsInputQuery,
  ): Promise<PaginationUtil<FilmsPublicOutputDto[]> | void> {
    this.logger.log(`Execute: Get films`, this.getAllFilms.name);

    const result = await this.queryBus.execute<
      GetPublicFilmsQuery,
      AppNotificationResult<PaginationUtil<FilmsPublicOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new GetPublicFilmsQuery(query));

    this.logger.log(result.appResult, this.getAllFilms.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(`:filmId`)
  @SwaggerDecoratorGetPublicFilmById()
  async getFilmById(
    @Param('filmId', ParseIntPatchPipe) filmId: number,
  ): Promise<FilmPublicOutputDto | void> {
    this.logger.log(`Execute: Get film by id: ${filmId}`, this.getFilmById.name);

    const result = await this.queryBus.execute<
      GetPublicFilmByIdQuery,
      AppNotificationResult<FilmPublicOutputDto, ErrorFieldExceptionDto | null>
    >(new GetPublicFilmByIdQuery(filmId));

    this.logger.log(result.appResult, this.getFilmById.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { MOVIES_ROUTE } from '@/common/constants/route.constants';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GenreOutputDto } from '@/movies/api/dtos/output/genre.output.dto';
import { SwaggerDecoratorGetAllGenre } from '@/movies/api/swagger/get-all-genre.swagger.decorator';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { GetAllGenreQuery } from '@/movies/application/query-handlers/get-all-genre.query-handler';
import { GetAllGenreInputQueryDto } from '@/movies/api/dtos/input/get-all-genre.input-query.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Public - movies')
@Controller(MOVIES_ROUTE.MAIN)
export class MoviesController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MoviesController.name);
  }

  @Get(MOVIES_ROUTE.GENRE)
  @SwaggerDecoratorGetAllGenre()
  async getAllGenre(
    @Query() query: GetAllGenreInputQueryDto,
  ): Promise<PaginationUtil<GenreOutputDto[]> | void> {
    this.logger.log('Execute: get all genre', this.getAllGenre.name);
    const result = await this.queryBus.execute<
      GetAllGenreQuery,
      AppNotificationResult<PaginationUtil<GenreOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new GetAllGenreQuery(query));

    this.logger.log(result.appResult, this.getAllGenre.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

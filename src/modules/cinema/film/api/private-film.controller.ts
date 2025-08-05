import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { PRIVATE_FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SwaggerDecoratorGetPrivateFilmByKinopoiskId } from '@/films/api/swagger/get-private-film-by-kinopoisk-id.swagger.decorator';
import { GetPrivateFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-private-film-by-kinopoisk-id.query-handler';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { FilmPrivateOutputDto } from '@/films/api/dtos/output/films-private.output.dto';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('Private - films')
@Controller(PRIVATE_FILMS_ROUTE.MAIN)
export class FilmPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(FilmPrivateController.name);
  }

  @Get(`:kpId/${PRIVATE_FILMS_ROUTE.KP}`)
  @SwaggerDecoratorGetPrivateFilmByKinopoiskId()
  async getFilmByKpId(
    @Param('kpId') kpId: string,
  ): Promise<AppNotificationResult<FilmPrivateOutputDto, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: Get film by kinopoisk id`, this.getFilmByKpId.name);

    const result = await this.queryBus.execute<
      GetPrivateFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmPrivateOutputDto, ErrorFieldExceptionDto | null>
    >(new GetPrivateFilmByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getFilmByKpId.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}

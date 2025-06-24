import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PRIVATE_FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SwaggerDecoratorGetPrivateFilmByKinopoiskId } from '@/films/api/swagger/get-private-film-by-kinopoisk-id.swagger.decorator';
import { GetPrivateFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-private-film-by-kinopoisk-id.query-handler';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { FilmPrivateOutputDto } from '@/films/api/dtos/output/films-private.output.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(ApiCinemaAccessTokenGuard)
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

  @Get(':kpId')
  @SwaggerDecoratorGetPrivateFilmByKinopoiskId()
  async getFilmByKpId(@Param('kpId') kpId: string): Promise<FilmPrivateOutputDto | void> {
    this.logger.log(`Execute: Get film by kinopoisk id`, this.getFilmByKpId.name);

    const result = await this.queryBus.execute<
      GetPrivateFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmPrivateOutputDto, ErrorFieldExceptionDto | null>
    >(new GetPrivateFilmByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getFilmByKpId.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

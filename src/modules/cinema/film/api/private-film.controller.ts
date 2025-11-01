import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { PRIVATE_FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { SwaggerDecoratorGetPrivateFilmByKinopoiskId } from '@/films/api/swagger/get-private-film-by-kinopoisk-id.swagger.decorator';
import { GetPrivateFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-private-film-by-kinopoisk-id.query-handler';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { FilmPrivateOutputDto } from '@/films/api/dtos/output/films-private.output.dto';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { NewFilmIsHandleNotificationCommand } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { SwaggerDecoratorNewFilmIsHandle } from '@/films/api/swagger/new-film-is-handle-private.swagger.decorator';
import { NewFilmNotificationPayloadDto } from '@/films/api/dtos/input/new-film-notification.input.dto';
import { NewFilmNotificationCommand } from '@/films/application/handlers/new-film-notification.handler';
import { SwaggerDecoratorNewFilm } from '@/films/api/swagger/new-film-private.swagger.decorator';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { NewFilmBackGroundContentPayloadDto } from '@/films/api/dtos/input/new-film-background-content.input.dto';
import { NewBackGroundContentFilmCommand } from '@/films/application/handlers/new-background-content-film.handler';
import { SwaggerDecoratorNewBackgroundContentForFilm } from '@/films/api/swagger/new-background-content-private.swagger.decorator';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('Private - films. Only for interaction between backends')
@Controller(PRIVATE_FILMS_ROUTE.MAIN)
export class FilmPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
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

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_FILMS_ROUTE.NEW_FILM_IS_HANDLE}`)
  @SwaggerDecoratorNewFilmIsHandle()
  async newFilmIsHandle(
    @Body() body: NewMovieIsHandleNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New film is handle notification`, this.newFilmIsHandle.name);

    const result = await this.commandBus.execute<
      NewFilmIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmIsHandleNotificationCommand(body));

    this.logger.log(result.appResult, this.newFilmIsHandle.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_FILMS_ROUTE.NEW_FILM}`)
  @SwaggerDecoratorNewFilm()
  async newFilm(
    @Body() body: NewFilmNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New film notification`, this.newFilm.name);

    const result = await this.commandBus.execute<
      NewFilmNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmNotificationCommand(body));

    this.logger.log(result.appResult, this.newFilm.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`${PRIVATE_FILMS_ROUTE.NEW_BACKGROUND_CONTENT}`)
  @SwaggerDecoratorNewBackgroundContentForFilm()
  async newBackgroundContent(
    @Body() body: NewFilmBackGroundContentPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: new background content for film`, this.newBackgroundContent.name);

    const result = await this.commandBus.execute<
      NewBackGroundContentFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewBackGroundContentFilmCommand(body.url, body.movieId));

    this.logger.log(result.appResult, this.newBackgroundContent.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}

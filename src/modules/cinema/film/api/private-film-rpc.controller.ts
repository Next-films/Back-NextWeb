import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { MessagePattern } from '@nestjs/microservices';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import {
  GET_FILM_BY_KP_ID_CMD,
  NEW_BACKGROUND_CONTENT_FOR_FILM_CMD,
  NEW_FILM_CMD,
  NEW_FILM_IS_HANDLE_CMD,
  REPLACE_FILM_SOURCE_CMD,
} from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { NewFilmNotificationCommand } from '@/films/application/handlers/new-film-notification.handler';
import { NewFilmIsHandleNotificationCommand } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { GetRpcFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-rpc-film-by-kinopoisk-id.query-handler';
import { FilmsRpcOutputDto } from '@/films/api/dtos/output/films-rpc.output.dto';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { NewFilmNotificationPayloadDto } from '@/films/api/dtos/input/new-film-notification.input.dto';
import { NewBackGroundContentFilmCommand } from '@/films/application/handlers/new-background-content-film.handler';
import { NewFilmBackGroundContentPayloadDto } from '@/films/api/dtos/input/new-film-background-content.input.dto';
import { ReplaceMovieSourcePayloadDto } from '@/movies/api/dtos/input/replace-movie-source.input.dto';
import { ReplaceMovieSourceOutputDto } from '@/movies/api/dtos/output/replace-movie-source.output.dto';
import { ReplaceFilmSourceCommand } from '@/films/application/handlers/replace-film-source.handler';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('private-films-rpc')
export class FilmPrivateRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(FilmPrivateRpcController.name);
  }

  @MessagePattern({ cmd: GET_FILM_BY_KP_ID_CMD })
  async getFilmByKpId(
    @RpcPayload() kpId: string,
  ): Promise<AppNotificationResult<FilmsRpcOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get film by kinopoisk id (rpc)`, this.getFilmByKpId.name);

    const result = await this.queryBus.execute<
      GetRpcFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmsRpcOutputDto, ErrorFieldExceptionDto | null>
    >(new GetRpcFilmByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getFilmByKpId.name);

    return result;
  }

  @MessagePattern({ cmd: NEW_FILM_CMD })
  async newFilm(@RpcPayload() payload: NewFilmNotificationPayloadDto): Promise<void> {
    this.logger.log(`Execute: New film notification`, this.newFilm.name);

    const result = await this.commandBus.execute<
      NewFilmNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmNotificationCommand(payload));

    this.logger.log(result.appResult, this.newFilm.name);
  }

  @MessagePattern({ cmd: REPLACE_FILM_SOURCE_CMD })
  async replaceFilmSource(
    @RpcPayload() payload: ReplaceMovieSourcePayloadDto,
  ): Promise<AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Replace film source`, this.replaceFilmSource.name);

    const result = await this.commandBus.execute<
      ReplaceFilmSourceCommand,
      AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>
    >(new ReplaceFilmSourceCommand(payload));

    this.logger.log(result.appResult, this.replaceFilmSource.name);

    return result;
  }

  @MessagePattern({ cmd: NEW_FILM_IS_HANDLE_CMD })
  async newFilmIsHandle(
    @RpcPayload() payload: NewMovieIsHandleNotificationPayloadDto,
  ): Promise<void> {
    this.logger.log(`Execute: New film is handle notification`, this.newFilmIsHandle.name);

    const result = await this.commandBus.execute<
      NewFilmIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewFilmIsHandleNotificationCommand(payload));

    this.logger.log(result.appResult, this.newFilmIsHandle.name);
  }

  @MessagePattern({ cmd: NEW_BACKGROUND_CONTENT_FOR_FILM_CMD })
  async newBackgroundContent(
    @RpcPayload() payload: NewFilmBackGroundContentPayloadDto,
  ): Promise<void> {
    this.logger.log(`Execute: new background content for film`, this.newBackgroundContent.name);

    const result = await this.commandBus.execute<
      NewBackGroundContentFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewBackGroundContentFilmCommand(payload.url, payload.movieId));

    this.logger.log(result.appResult, this.newBackgroundContent.name);
  }
}

import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GetFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-film-by-kinopoisk-id.query-handler';
import { MessagePattern } from '@nestjs/microservices';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import {
  GET_FILM_BY_KP_ID_CMD,
  NEW_FILM_CMD,
  NEW_FILM_IS_HANDLE_CMD,
} from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { NewFilmNotificationPayloadDto } from '@/films/domain/types';
import { NewFilmNotificationCommand } from '@/films/application/handlers/new-film-notification.handler';
import { NewFilmIsHandleNotificationCommand } from '@/films/application/handlers/new-film-is-handle-notification.handler';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/domain/types';

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
  ): Promise<AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get film by kinopoisk id`, this.getFilmByKpId.name);

    const result = await this.queryBus.execute<
      GetFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetFilmByKinopoiskIdQuery(kpId));

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
}

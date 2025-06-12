import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { FilmsOutputDto } from '@/films/api/dtos/output/films.output.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GetFilmByKinopoiskIdQuery } from '@/films/application/query-handlers/get-film-by-kinopoisk-id.query-handler';
import { MessagePattern } from '@nestjs/microservices';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { GET_FILM_BY_KP_ID_CMD } from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('private-films-rpc')
export class FilmPrivateRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(FilmPrivateRpcController.name);
  }

  @MessagePattern({ cmd: GET_FILM_BY_KP_ID_CMD })
  async getFilmByKpId(
    @RpcPayload() kpId: string,
  ): Promise<AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get film by kinopoisk id`, this.getFilmByKpId.name);

    return this.queryBus.execute<
      GetFilmByKinopoiskIdQuery,
      AppNotificationResult<FilmsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetFilmByKinopoiskIdQuery(kpId));
  }
}

import { ApiExcludeController } from '@nestjs/swagger';
import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import {
  BAN_PROVIDER_MOVIE_CMD,
  GET_BANNED_MOVIE_BY_PROVIDER_CMD,
} from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { BanProviderMovieCommand } from '@/banned-providers-movie/application/handlers/ban-provider-movie.handler';
import { GetBannedMovieByProviderRpcQuery } from '@/banned-providers-movie/application/query-handlers/get-banned-movie-by-provider-rpc.query-handler';
import { BannedMoviesByProviderRpcOutputDto } from '@/banned-providers-movie/api/dtos/output/banned-movies-by-provider-rpc.output.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { BanProviderMoviePayloadDto } from '@/banned-providers-movie/api/dtos/input/ban-provider-movie-rpc.input.dto';
import { GetBannedMovieByProviderPayloadDto } from '@/banned-providers-movie/api/dtos/input/get-banned-provider-movie-rpc.input.dto';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('banned-providers-movie-rpc')
export class BannedProvidersMovieRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(BannedProvidersMovieRpcController.name);
  }

  @MessagePattern({ cmd: BAN_PROVIDER_MOVIE_CMD })
  async banProviderMovie(@RpcPayload() payload: BanProviderMoviePayloadDto): Promise<void> {
    this.logger.log(`Execute: ban provider movie (rpc)`, this.banProviderMovie.name);

    const result = await this.commandBus.execute<
      BanProviderMovieCommand,
      AppNotificationResult<null>
    >(new BanProviderMovieCommand(payload));

    this.logger.log(result.appResult, this.banProviderMovie.name);
  }

  @MessagePattern({ cmd: GET_BANNED_MOVIE_BY_PROVIDER_CMD })
  async getBannedMovieByProvider(
    @RpcPayload() payload: GetBannedMovieByProviderPayloadDto,
  ): Promise<
    AppNotificationResult<BannedMoviesByProviderRpcOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log(
      `Execute: get banned movie by provider (rpc)`,
      this.getBannedMovieByProvider.name,
    );

    const result = await this.queryBus.execute<
      GetBannedMovieByProviderRpcQuery,
      AppNotificationResult<BannedMoviesByProviderRpcOutputDto, ErrorFieldExceptionDto | null>
    >(new GetBannedMovieByProviderRpcQuery(payload.provider, payload.providerId));

    this.logger.log(result.appResult, this.getBannedMovieByProvider.name);

    return result;
  }
}

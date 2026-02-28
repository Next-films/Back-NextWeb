import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { MessagePattern } from '@nestjs/microservices';
import { MODERATE_MOVIE_CMD } from '@/common/constants/rmq.constants';
import { ModerateRequestPayloadDto } from '@/admin/api/dtos/input/admin-moderate-movie.input.dto';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { CommandBus } from '@nestjs/cqrs';
import { AdminModerateRequestByTorrentCommand } from '@/admin/application/handlers/admin-moderate-movie-request-by-torrent.handler';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('admin-cinema-rpc')
export class AdminCinemaRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(AdminCinemaRpcController.name);
  }

  @MessagePattern({ cmd: MODERATE_MOVIE_CMD })
  async moderateMovie(@RpcPayload() payload: ModerateRequestPayloadDto): Promise<void> {
    this.logger.log(`Execute: Moderate movie request by torrent`, this.moderateMovie.name);

    const result = await this.commandBus.execute<
      AdminModerateRequestByTorrentCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminModerateRequestByTorrentCommand(payload));

    this.logger.log(result.appResult, this.moderateMovie.name);
  }
}

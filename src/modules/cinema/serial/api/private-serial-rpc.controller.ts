import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import {
  GET_SERIAL_BY_KP_ID_CMD,
  NEW_SERIAL_CMD,
  NEW_SERIAL_IS_HANDLE_CMD,
  NEW_BACKGROUND_CONTENT_FOR_SERIAL_CMD,
} from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { NewSerialNotificationCommand } from '@/serials/application/handlers/new-serial-notification.handler';
import { NewSerialIsHandleNotificationCommand } from '@/serials/application/handlers/new-serial-is-handle-notification.handler';
import { NewSerialNotificationPayloadDto } from '@/serials/api/dtos/input/new-serial-notification.input.dto';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { GetRpcSerialByKinopoiskIdQuery } from '@/serials/application/query-handlers/get-rpc-serial-by-kinopoisk-id.query-handler';
import { SerialsRpcOutputDto } from '@/serials/api/dtos/output/serials-rpc.output.dto';
import { NewSerialBackGroundContentPayloadDto } from '@/serials/api/dtos/input/new-serial-background-content.input.dto';
import { NewBackGroundContentSerialCommand } from '@/serials/application/handlers/new-background-content-serial.handler';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('private-serial-rpc')
export class SerialPrivateRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(SerialPrivateRpcController.name);
  }

  @MessagePattern({ cmd: GET_SERIAL_BY_KP_ID_CMD })
  async getSerialByKpId(
    @RpcPayload() kpId: string,
  ): Promise<AppNotificationResult<SerialsRpcOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get serial by kinopoisk id (rpc)`, this.getSerialByKpId.name);

    const result = await this.queryBus.execute<
      GetRpcSerialByKinopoiskIdQuery,
      AppNotificationResult<SerialsRpcOutputDto, ErrorFieldExceptionDto | null>
    >(new GetRpcSerialByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getSerialByKpId.name);

    return result;
  }

  @MessagePattern({ cmd: NEW_SERIAL_CMD })
  async newSerial(@RpcPayload() payload: NewSerialNotificationPayloadDto): Promise<void> {
    this.logger.log(`Execute: New serial notification`, this.newSerial.name);

    const result = await this.commandBus.execute<
      NewSerialNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewSerialNotificationCommand(payload));

    this.logger.log(result.appResult, this.newSerial.name);
  }

  @MessagePattern({ cmd: NEW_SERIAL_IS_HANDLE_CMD })
  async newSerialIsHandle(
    @RpcPayload() payload: NewMovieIsHandleNotificationPayloadDto,
  ): Promise<void> {
    this.logger.log(`Execute: New serial is handle notification`, this.newSerialIsHandle.name);

    const result = await this.commandBus.execute<
      NewSerialIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewSerialIsHandleNotificationCommand(payload));

    this.logger.log(result.appResult, this.newSerialIsHandle.name);
  }

  @MessagePattern({ cmd: NEW_BACKGROUND_CONTENT_FOR_SERIAL_CMD })
  async newBackgroundContent(
    @RpcPayload() payload: NewSerialBackGroundContentPayloadDto,
  ): Promise<void> {
    this.logger.log(`Execute: new background content for serial`, this.newBackgroundContent.name);

    const result = await this.commandBus.execute<
      NewBackGroundContentSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewBackGroundContentSerialCommand(payload.url, payload.movieId));

    this.logger.log(result.appResult, this.newBackgroundContent.name);
  }
}

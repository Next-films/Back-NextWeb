import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { MessagePattern } from '@nestjs/microservices';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { GET_CARTOON_BY_KP_ID_CMD, NEW_CARTOON_CMD } from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { GetCartoonByKinopoiskIdQuery } from '@/cartoons/application/query-handlers/get-cartoon-by-kinopoisk-id.query-handler';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';
import { NewCartoonNotificationPayloadDto } from '@/cartoons/domain/types';
import { NewCartoonNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-notification.handler';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('private-cartoon-rpc')
export class CartoonPrivateRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(CartoonPrivateRpcController.name);
  }

  @MessagePattern({ cmd: GET_CARTOON_BY_KP_ID_CMD })
  async getCartoonByKpId(
    @RpcPayload() kpId: string,
  ): Promise<AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get cartoon by kinopoisk id`, this.getCartoonByKpId.name);

    const result = await this.queryBus.execute<
      GetCartoonByKinopoiskIdQuery,
      AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetCartoonByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getCartoonByKpId.name);

    return result;
  }

  @MessagePattern({ cmd: NEW_CARTOON_CMD })
  async newCartoon(@RpcPayload() payload: NewCartoonNotificationPayloadDto): Promise<void> {
    this.logger.log(`Execute: New cartoon notification`, this.newCartoon.name);

    const result = await this.commandBus.execute<
      NewCartoonNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewCartoonNotificationCommand(payload));

    this.logger.log(result.appResult, this.newCartoon.name);
  }
}

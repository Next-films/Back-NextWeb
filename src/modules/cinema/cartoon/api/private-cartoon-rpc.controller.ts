import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AppNotificationResult } from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { MessagePattern } from '@nestjs/microservices';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { GET_CARTOON_BY_KP_ID_CMD, NEW_CARTOON_CMD } from '@/common/constants/rmq.constants';
import { RpcPayload } from '@/common/decorators/rpc-payload.decorator';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { GetCartoonByKinopoiskIdQuery } from '@/cartoons/application/query-handlers/get-cartoon-by-kinopoisk-id.query-handler';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('private-cartoon-rpc')
export class CartoonPrivateRpcController {
  constructor(
    private readonly logger: LoggerService,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(CartoonPrivateRpcController.name);
  }

  @MessagePattern({ cmd: GET_CARTOON_BY_KP_ID_CMD })
  async getCartoonByKpId(
    @RpcPayload() kpId: string,
  ): Promise<AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Execute: Get cartoon by kinopoisk id`, this.getCartoonByKpId.name);

    return this.queryBus.execute<
      GetCartoonByKinopoiskIdQuery,
      AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetCartoonByKinopoiskIdQuery(kpId));
  }

  @MessagePattern({ cmd: NEW_CARTOON_CMD })
  newCartoon(): void {
    // @RpcPayload() payload: NewMovieNotificationPayloadDto
    this.logger.log(`Execute: New cartoon notification`, this.newCartoon.name);
  }
}

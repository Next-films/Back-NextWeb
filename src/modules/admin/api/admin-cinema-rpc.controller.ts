import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { RpcExceptionsFilter } from '@/common/exception-filters/rpc/rpc-exception.filter';
import { ApiCinemaRmqAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-rmq-access-token.guard';
import { MessagePattern } from '@nestjs/microservices';
import { MODERATE_MOVIE_CMD } from '@/common/constants/rmq.constants';

@ApiExcludeController()
@UseFilters(RpcExceptionsFilter)
@UseGuards(ApiCinemaRmqAccessTokenGuard)
@Controller('admin-cinema-rpc')
export class AdminCinemaRpcController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(AdminCinemaRpcController.name);
  }

  // TODO:
  @MessagePattern({ cmd: MODERATE_MOVIE_CMD })
  moderateMovie() //@RpcPayload() payload: ModerateRequestPayloadDto
  : void {
    this.logger.log(`Execute: Moderate movie`, this.moderateMovie.name);
  }
}

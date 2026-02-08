import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import {
  SerialsRpcOutputDto,
  SerialsRpcOutputDtoMapper,
} from '@/serials/api/dtos/output/serials-rpc.output.dto';

export class GetRpcSerialByKinopoiskIdQuery implements IQuery {
  constructor(public kpId: string) {}
}

@QueryHandler(GetRpcSerialByKinopoiskIdQuery)
export class GetRpcSerialByKinopoiskIdQueryHandler
  implements
    IQueryHandler<
      GetRpcSerialByKinopoiskIdQuery,
      AppNotificationResult<SerialsRpcOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly serialsRpcOutputDtoMapper: SerialsRpcOutputDtoMapper,
  ) {
    this.logger.setContext(GetRpcSerialByKinopoiskIdQueryHandler.name);
  }

  async execute(
    query: GetRpcSerialByKinopoiskIdQuery,
  ): Promise<AppNotificationResult<SerialsRpcOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = query;
    this.logger.log(`Get serial by kinopoisk id command (rpc): ${kpId}`, this.execute.name);
    try {
      const serial = await this.serialQueryRepository.getSerialByKinopoiskId(kpId);

      if (!serial)
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const result = this.serialsRpcOutputDtoMapper.mapMovie(serial);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

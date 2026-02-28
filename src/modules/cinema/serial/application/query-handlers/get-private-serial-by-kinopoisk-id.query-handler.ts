import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  SerialPrivateOutputDto,
  SerialsPrivateOutputDtoMapper,
} from '@/serials/api/dtos/output/serials-private.output.dto';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';

export class GetPrivateSerialByKinopoiskIdQuery implements IQuery {
  constructor(public kpId: string) {}
}

@QueryHandler(GetPrivateSerialByKinopoiskIdQuery)
export class GetPrivateSerialByKinopoiskIdQueryHandler
  implements
    IQueryHandler<
      GetPrivateSerialByKinopoiskIdQuery,
      AppNotificationResult<SerialPrivateOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialRepository: SerialRepository,
    private readonly serialsPrivateOutputDtoMapper: SerialsPrivateOutputDtoMapper,
  ) {
    this.logger.setContext(GetPrivateSerialByKinopoiskIdQueryHandler.name);
  }

  async execute(
    query: GetPrivateSerialByKinopoiskIdQuery,
  ): Promise<AppNotificationResult<SerialPrivateOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = query;
    this.logger.log(`Get serial by kinopoisk id command: ${kpId}`, this.execute.name);
    try {
      const serial = await this.serialRepository.getSerialByKinopoiskId(kpId);

      if (!serial)
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const result = this.serialsPrivateOutputDtoMapper.mapMovie(serial);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

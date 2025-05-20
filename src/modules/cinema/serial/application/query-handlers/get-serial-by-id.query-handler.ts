import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import {
  SerialsOutputDto,
  SerialsOutputDtoMapper,
} from '@/serials/api/dtos/output/serials.output.dto';

export class GetSerialByIdQuery implements IQuery {
  constructor(public serialId: number) {}
}

@QueryHandler(GetSerialByIdQuery)
export class GetSerialByIdQueryHandler
  implements
    IQueryHandler<
      GetSerialByIdQuery,
      AppNotificationResult<SerialsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly serialsOutputDtoMapper: SerialsOutputDtoMapper,
  ) {
    this.logger.setContext(GetSerialByIdQueryHandler.name);
  }

  async execute(
    query: GetSerialByIdQuery,
  ): Promise<AppNotificationResult<SerialsOutputDto, ErrorFieldExceptionDto | null>> {
    const { serialId } = query;
    this.logger.log(`Get serial by id command: ${serialId}`, this.execute.name);
    try {
      const serial = await this.serialQueryRepository.getSerialById(serialId);
      if (!serial)
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const result = this.serialsOutputDtoMapper.mapSpecifySerial(serial);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

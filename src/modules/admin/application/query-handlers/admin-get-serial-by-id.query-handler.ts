import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  AdminCinemaSerialsOutputDto,
  AdminCinemaSerialsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';

export class AdminGetSerialByIdQuery implements IQuery {
  constructor(public serialId: number) {}
}

@QueryHandler(AdminGetSerialByIdQuery)
export class AdminGetSerialByIdQueryHandler
  implements
    IQueryHandler<
      AdminGetSerialByIdQuery,
      AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly serialQueryRepository: SerialQueryRepository,
    private readonly adminCinemaSerialsOutputDtoMapper: AdminCinemaSerialsOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetSerialByIdQueryHandler.name);
  }

  async execute(
    query: AdminGetSerialByIdQuery,
  ): Promise<AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Get serial by id by admin command`, this.execute.name);
    const { serialId } = query;
    try {
      const serial = await this.serialQueryRepository.getSerialById(serialId);

      if (!serial)
        return this.appNotification.notFound({
          field: 'id',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      return this.appNotification.success(this.adminCinemaSerialsOutputDtoMapper.mapMovie(serial));
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

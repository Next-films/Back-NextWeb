import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import {
  AdminCinemaCartoonsOutputDto,
  AdminCinemaCartoonsOutputDtoMapper,
} from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';

export class AdminGetCartoonByIdQuery implements IQuery {
  constructor(public cartoonId: number) {}
}

@QueryHandler(AdminGetCartoonByIdQuery)
export class AdminGetCartoonByIdQueryHandler
  implements
    IQueryHandler<
      AdminGetCartoonByIdQuery,
      AppNotificationResult<AdminCinemaCartoonsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly adminCinemaCartoonsOutputDtoMapper: AdminCinemaCartoonsOutputDtoMapper,
  ) {
    this.logger.setContext(AdminGetCartoonByIdQueryHandler.name);
  }

  async execute(
    query: AdminGetCartoonByIdQuery,
  ): Promise<AppNotificationResult<AdminCinemaCartoonsOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Get cartoon by id by admin command`, this.execute.name);
    const { cartoonId } = query;
    try {
      const cartoon = await this.cartoonQueryRepository.getCartoonById(cartoonId);

      if (!cartoon)
        return this.appNotification.notFound({
          field: 'id',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      return this.appNotification.success(
        this.adminCinemaCartoonsOutputDtoMapper.mapMovie(cartoon),
      );
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

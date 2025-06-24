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
  CartoonsPrivateOutputDto,
  CartoonsPrivateOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons-private.output.dto';

export class GetPrivateCartoonByKinopoiskIdQuery implements IQuery {
  constructor(public kpId: string) {}
}

@QueryHandler(GetPrivateCartoonByKinopoiskIdQuery)
export class GetPrivateCartoonByKinopoiskIdQueryHandler
  implements
    IQueryHandler<
      GetPrivateCartoonByKinopoiskIdQuery,
      AppNotificationResult<CartoonsPrivateOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly cartoonsPrivateOutputDtoMapper: CartoonsPrivateOutputDtoMapper,
  ) {
    this.logger.setContext(GetPrivateCartoonByKinopoiskIdQueryHandler.name);
  }

  async execute(
    query: GetPrivateCartoonByKinopoiskIdQuery,
  ): Promise<AppNotificationResult<CartoonsPrivateOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = query;
    this.logger.log(`Get cartoon by kinopoisk id command: ${kpId}`, this.execute.name);
    try {
      const cartoon = await this.cartoonQueryRepository.getCartoonByKinopoiskId(kpId);

      if (!cartoon)
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const result = this.cartoonsPrivateOutputDtoMapper.mapMovie(cartoon);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

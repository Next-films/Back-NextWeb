import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import {
  CartoonsOutputDto,
  CartoonsOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons.output.dto';

export class GetCartoonByIdQuery implements IQuery {
  constructor(public cartoonId: number) {}
}

@QueryHandler(GetCartoonByIdQuery)
export class GetCartoonByIdQueryHandler
  implements
    IQueryHandler<
      GetCartoonByIdQuery,
      AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly cartoonsOutputDtoMapper: CartoonsOutputDtoMapper,
  ) {
    this.logger.setContext(GetCartoonByIdQueryHandler.name);
  }

  async execute(
    query: GetCartoonByIdQuery,
  ): Promise<AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>> {
    const { cartoonId } = query;
    this.logger.log(`Get cartoon by id command: ${cartoonId}`, this.execute.name);
    try {
      const cartoon = await this.cartoonQueryRepository.getCartoonById(cartoonId);
      if (!cartoon)
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const result = this.cartoonsOutputDtoMapper.mapMovie(cartoon);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

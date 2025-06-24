import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  CartoonPublicOutputDto,
  CartoonsPublicOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons-public.output.dto';
import { CartoonPublicQueryRepository } from '@/cartoons/infrastructure/cartoon-public.query-repository';

export class GetPublicCartoonByIdQuery implements IQuery {
  constructor(public cartoonId: number) {}
}

@QueryHandler(GetPublicCartoonByIdQuery)
export class GetPublicCartoonByIdQueryHandler
  implements
    IQueryHandler<
      GetPublicCartoonByIdQuery,
      AppNotificationResult<CartoonPublicOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonPublicQueryRepository: CartoonPublicQueryRepository,
    private readonly cartoonsPublicOutputDtoMapper: CartoonsPublicOutputDtoMapper,
  ) {
    this.logger.setContext(GetPublicCartoonByIdQueryHandler.name);
  }

  async execute(
    query: GetPublicCartoonByIdQuery,
  ): Promise<AppNotificationResult<CartoonPublicOutputDto, ErrorFieldExceptionDto | null>> {
    const { cartoonId } = query;
    this.logger.log(`Get cartoon by id command: ${cartoonId}`, this.execute.name);
    try {
      const cartoon = await this.cartoonPublicQueryRepository.getCartoonById(cartoonId);
      if (!cartoon)
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const result = this.cartoonsPublicOutputDtoMapper.mapMovie(cartoon);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

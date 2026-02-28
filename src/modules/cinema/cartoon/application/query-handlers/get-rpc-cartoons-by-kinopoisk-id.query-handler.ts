import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import {
  CartoonsRpcOutputDto,
  CartoonsRpcOutputDtoMapper,
} from '@/cartoons/api/dtos/output/cartoons-rpc.output.dto';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';

export class GetRpcCartoonsByKinopoiskIdQuery implements IQuery {
  constructor(public kpId: string) {}
}

@QueryHandler(GetRpcCartoonsByKinopoiskIdQuery)
export class GetRpcCartoonsByKinopoiskIdQueryHandler
  implements
    IQueryHandler<
      GetRpcCartoonsByKinopoiskIdQuery,
      AppNotificationResult<CartoonsRpcOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly cartoonQueryRepository: CartoonQueryRepository,
    private readonly cartoonsRpcOutputDtoMapper: CartoonsRpcOutputDtoMapper,
  ) {
    this.logger.setContext(GetRpcCartoonsByKinopoiskIdQueryHandler.name);
  }

  async execute(
    query: GetRpcCartoonsByKinopoiskIdQuery,
  ): Promise<AppNotificationResult<CartoonsRpcOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId } = query;
    this.logger.log(`Get cartoon by kinopoisk id command (rpc): ${kpId}`, this.execute.name);
    try {
      const cartoon = await this.cartoonQueryRepository.getCartoonByKinopoiskId(kpId);

      if (!cartoon)
        return this.appNotification.notFound({
          field: 'kpId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const result = this.cartoonsRpcOutputDtoMapper.mapMovie(cartoon);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

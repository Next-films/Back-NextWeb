import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { BannedProvidersMovieQueryRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.query-repository';
import {
  BannedMoviesByProviderRpcOutputDto,
  BannedMoviesByProviderRpcOutputDtpMapper,
} from '@/banned-providers-movie/api/dtos/output/banned-movies-by-provider-rpc.output.dto';
import { TorApiProvidersEnum } from '@/common/types/types';

export class GetBannedMovieByProviderRpcQuery implements IQuery {
  constructor(
    public provider: TorApiProvidersEnum,
    public providerId: string,
  ) {}
}

@QueryHandler(GetBannedMovieByProviderRpcQuery)
export class GetBannedMovieByProviderRpcQueryHandler
  implements
    IQueryHandler<
      GetBannedMovieByProviderRpcQuery,
      AppNotificationResult<BannedMoviesByProviderRpcOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly bannedProvidersMovieQueryRepository: BannedProvidersMovieQueryRepository,
    private readonly bannedMoviesByProviderRpcOutputDtpMapper: BannedMoviesByProviderRpcOutputDtpMapper,
  ) {
    this.logger.setContext(GetBannedMovieByProviderRpcQueryHandler.name);
  }

  async execute(
    query: GetBannedMovieByProviderRpcQuery,
  ): Promise<
    AppNotificationResult<BannedMoviesByProviderRpcOutputDto, ErrorFieldExceptionDto | null>
  > {
    const { provider, providerId } = query;
    this.logger.log(
      `Get banned movie by provider command: ${provider}, provider id: ${providerId}`,
      this.execute.name,
    );
    try {
      const inst = await this.bannedProvidersMovieQueryRepository.getBannedProviderMovie(
        provider,
        providerId,
      );

      if (!inst)
        return this.appNotification.notFound({
          field: 'provider',
          message: 'Banned movie by provider not found',
          errorKey: EXCEPTION_KEYS_ENUM.BANNED_MOVIE_BY_PROVIDER_NOT_FOUND,
        });

      const result = this.bannedMoviesByProviderRpcOutputDtpMapper.mapEntity(inst);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

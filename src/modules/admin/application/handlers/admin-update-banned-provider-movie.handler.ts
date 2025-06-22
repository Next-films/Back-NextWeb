import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { BannedProvidersMovieRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.repository';
import { AdminUpdateBannedProviderMovieInputDto } from '@/admin/api/dtos/input/admin-update-banned-provider-movie.input.dto';

export class AdminUpdateBannedProviderMovieCommand implements ICommand {
  constructor(
    public bannedProviderMovieId: number,
    public inputDto: AdminUpdateBannedProviderMovieInputDto,
  ) {}
}

@CommandHandler(AdminUpdateBannedProviderMovieCommand)
export class AdminUpdateBannedProviderMovieCommandHandler
  implements
    ICommandHandler<
      AdminUpdateBannedProviderMovieCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly bannedProvidersMovieRepository: BannedProvidersMovieRepository,
  ) {
    this.logger.setContext(AdminUpdateBannedProviderMovieCommandHandler.name);
  }
  async execute(
    command: AdminUpdateBannedProviderMovieCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto, bannedProviderMovieId } = command;
    const { movieName } = inputDto;
    this.logger.log(`Update banned provider movie command`, this.execute.name);
    try {
      const ints = await this.bannedProvidersMovieRepository.getBannedProviderMovieById(
        bannedProviderMovieId,
      );

      if (!ints)
        return this.appNotification.notFound({
          field: 'bannedProviderMovieId',
          message: 'The banned provider movie not found',
          errorKey: EXCEPTION_KEYS_ENUM.BANNED_PROVIDER_MOVIE_NOT_FOUND,
        });

      ints.update(movieName);

      await this.bannedProvidersMovieRepository.save(ints);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

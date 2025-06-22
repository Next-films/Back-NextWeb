import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminBanUnbanProviderMovieInputDto } from '@/admin/api/dtos/input/ban-unban-provider-movie.input.dto';
import { BannedProvidersMovieRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.repository';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { TorApiProvidersEnum } from '@/common/types/types';

export class AdminBanOrUnbanProviderMovieCommand implements ICommand {
  constructor(public inputDto: AdminBanUnbanProviderMovieInputDto) {}
}

@CommandHandler(AdminBanOrUnbanProviderMovieCommand)
export class AdminBanOrUnbanProviderMovieCommandHandler
  implements
    ICommandHandler<
      AdminBanOrUnbanProviderMovieCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly bannedProvidersMovieRepository: BannedProvidersMovieRepository,
    @Inject(BannedProvidersMovie.name)
    private readonly bannedProvidersMovieEntity: typeof BannedProvidersMovie,
  ) {
    this.logger.setContext(AdminBanOrUnbanProviderMovieCommandHandler.name);
  }
  async execute(
    command: AdminBanOrUnbanProviderMovieCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { inputDto } = command;
    const { provider, providerId, isBan, movieName } = inputDto;
    this.logger.log(`Ban or unban provider movie command`, this.execute.name);
    try {
      const ints = await this.bannedProvidersMovieRepository.getBannedProviderMovie(
        provider,
        providerId,
      );

      if (ints) {
        await this.handleExistMovie(ints, isBan);
      } else {
        if (!isBan)
          return this.appNotification.badRequest({
            field: 'isBan',
            message: 'A movie cannot be banned if it has not been banned.',
            errorKey: EXCEPTION_KEYS_ENUM.MOVIE_NOT_BANNED_CANNOT_UNBAN,
          });
        await this.handleNewMovie(provider, providerId, movieName);
      }

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  async handleNewMovie(
    provider: TorApiProvidersEnum,
    providerId: string,
    movieName: string,
  ): Promise<void> {
    const ban = this.bannedProvidersMovieEntity.create(provider, providerId, movieName);

    await this.bannedProvidersMovieRepository.save(ban);
  }

  async handleExistMovie(inst: BannedProvidersMovie, isBan: boolean): Promise<void> {
    if (isBan) return;

    await this.bannedProvidersMovieRepository.remove(inst.id);
  }
}

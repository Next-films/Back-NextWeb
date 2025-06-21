import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { BanProviderMoviePayloadDto } from '@/banned-providers-movie/domain/types';
import { BannedProvidersMovieRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.repository';

export class BanProviderMovieCommand implements ICommand {
  constructor(public inputDto: BanProviderMoviePayloadDto) {}
}

@CommandHandler(BanProviderMovieCommand)
export class BanProviderMovieCommandHandler
  implements ICommandHandler<BanProviderMovieCommand, AppNotificationResult<null>>
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly bannedProvidersMovieRepository: BannedProvidersMovieRepository,
    @Inject(BannedProvidersMovie.name)
    private readonly bannedProvidersMovieEntity: typeof BannedProvidersMovie,
  ) {
    this.logger.setContext(BanProviderMovieCommandHandler.name);
  }

  async execute(command: BanProviderMovieCommand): Promise<AppNotificationResult<null>> {
    const { inputDto } = command;
    const { providerId, provider, movieName } = inputDto;
    this.logger.log(`Ban provider movie command`, this.execute.name);
    try {
      const inst = await this.bannedProvidersMovieRepository.getBannedProviderMovie(
        provider,
        providerId,
      );
      if (inst) return this.appNotification.success(null);

      const newInst = this.bannedProvidersMovieEntity.create(provider, providerId, movieName);

      await this.bannedProvidersMovieRepository.save(newInst);
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

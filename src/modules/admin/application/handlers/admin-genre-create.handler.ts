import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { Genre } from '@/movies/domain/genre.entity';
import { GenreRepository } from '@/movies/infrastructure/genre.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export class AdminGenreCreateCommand implements ICommand {
  constructor(public nameRaw: string) {}
}

@CommandHandler(AdminGenreCreateCommand)
export class AdminGenreCreateCommandHandler
  implements
    ICommandHandler<
      AdminGenreCreateCommand,
      AppNotificationResult<number, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(Genre.name) private readonly genreEntity: typeof Genre,
    private readonly genreRepository: GenreRepository,
  ) {
    this.logger.setContext(AdminGenreCreateCommandHandler.name);
  }
  async execute(
    command: AdminGenreCreateCommand,
  ): Promise<AppNotificationResult<number, ErrorFieldExceptionDto | null>> {
    const { nameRaw } = command;
    this.logger.log(`Create new genre command: ${nameRaw}`, this.execute.name);
    try {
      const name = nameRaw.toLowerCase();
      const genre = await this.genreRepository.getByName(name);

      if (genre)
        return this.appNotification.badRequest({
          field: 'name',
          message: 'The genre is exists',
          errorKey: EXCEPTION_KEYS_ENUM.GENRE_NAME_IS_EXIST,
        });

      const newGenre = this.genreEntity.create(name);

      const result = await this.genreRepository.save(newGenre);

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

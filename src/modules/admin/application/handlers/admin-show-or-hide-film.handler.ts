import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminShowOrHiddeFilmInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-film.input.dto';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus } from '@/movies/domain/types';

export class AdminShowOrHiddeFilmCommand implements ICommand {
  constructor(
    public filmId: number,
    public inputDto: AdminShowOrHiddeFilmInputDto,
  ) {}
}

@CommandHandler(AdminShowOrHiddeFilmCommand)
export class AdminShowOrHiddeFilmCommandHandler
  implements
    ICommandHandler<
      AdminShowOrHiddeFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(AdminShowOrHiddeFilmCommandHandler.name);
  }
  async execute(
    command: AdminShowOrHiddeFilmCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Show or hidde film by admin command`, this.execute.name);
    const { inputDto, filmId } = command;
    const { status, isHidden } = inputDto;
    try {
      const film = await this.filmRepository.getFilmById(filmId);

      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      if (
        (film.isHidden === isHidden && status && status === film.handleStatus) ||
        (!status && film.isHidden === isHidden)
      )
        return this.appNotification.success(null);

      const prevStatus = film.handleStatus;

      film.showOrHiddeMovie(isHidden, status);

      await this.filmRepository.save(film);

      this.publish(film, prevStatus);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  // TODO: Продумать логику модерации, нужно снимать с модерации фильм если статус меняется и ставить на модерацию
  private publish(film: Film, prevStatus: MovieHandleStatus): void {
    if (
      prevStatus === MovieHandleStatus.MODERATE &&
      film.handleStatus === MovieHandleStatus.MODERATE
    )
      if (film.handleStatus === MovieHandleStatus.MODERATE) {
        /// TODO Создаение модерации
        // await this.commandBus.execute(
        //   new CreateModerationMovieCommand({ type: MovieTypesEnum.FILM, movieId: film.id }),
        // );
      }
  }
}

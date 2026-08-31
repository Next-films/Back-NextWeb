import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { MovieHandleStatus } from '@/movies/domain/types';
import { ReplaceMovieSourcePayloadDto } from '@/movies/api/dtos/input/replace-movie-source.input.dto';
import { ReplaceMovieSourceOutputDto } from '@/movies/api/dtos/output/replace-movie-source.output.dto';

export class ReplaceFilmSourceCommand implements ICommand {
  constructor(public inputDto: ReplaceMovieSourcePayloadDto) {}
}

@CommandHandler(ReplaceFilmSourceCommand)
export class ReplaceFilmSourceCommandHandler
  implements
    ICommandHandler<
      ReplaceFilmSourceCommand,
      AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(ReplaceFilmSourceCommandHandler.name);
  }

  async execute(
    command: ReplaceFilmSourceCommand,
  ): Promise<AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId, key, duration } = command.inputDto;
    this.logger.log('Replace film source command', this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const film = await this.filmRepository.getFilmByKinopoiskId(kpId, queryRunner);

      if (!film) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.notFound({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
          message: 'Film not found',
          field: 'kpId',
        });
      }

      // Повторный вызов с тем же ключом: нужное состояние уже достигнуто.
      // Отдаём success и previousVideoUrl = null — вызывающей стороне нечего удалять,
      // иначе она снесёт файл, который прямо сейчас играет.
      if (film.videoUrl === key) {
        await queryRunner.commitTransaction();

        return this.appNotification.success({ previousVideoUrl: null });
      }

      // Фильм на модерации — там уже идёт ручная работа, не вмешиваемся.
      if (film.handleStatus === MovieHandleStatus.MODERATE) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_ON_MODERATION,
          message: 'Film is on moderation, source replacement is not allowed',
          field: 'kpId',
        });
      }

      // Нечего заменять: фильм ещё не опубликован. Это штатный случай для new-film.
      if (film.handleStatus !== MovieHandleStatus.PRODUCTION || !film.videoUrl) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.FILM_SOURCE_NOT_REPLACEABLE,
          message: 'Film has no published source to replace, use new-film instead',
          field: 'kpId',
        });
      }

      const previousVideoUrl = film.videoUrl;

      // Меняем только источник. Метаданные, постеры, жанры и статус не трогаем:
      // фильм уже прошёл модерацию, для зрителя меняется лишь файл.
      film.replaceVideoSource(key, duration || 0);

      await this.filmRepository.save(film, queryRunner);
      await queryRunner.commitTransaction();

      return this.appNotification.success({ previousVideoUrl });
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();

      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }
}

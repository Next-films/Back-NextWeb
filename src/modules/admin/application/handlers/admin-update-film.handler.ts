import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { AdminUpdateFilmInputDto } from '@/admin/api/dtos/input/admin-update-film.input.dto';
import { MoviesService } from '@/movies/application/movies.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { FilmUpdateDto } from '@/films/domain/types';
import { DateUtil } from '@/common/utils/date.util';

export class AdminUpdateFilmCommand implements ICommand {
  constructor(
    public filmId: number,
    public inputDto: AdminUpdateFilmInputDto,
  ) {}
}

@CommandHandler(AdminUpdateFilmCommand)
export class AdminUpdateFilmCommandHandler
  implements
    ICommandHandler<
      AdminUpdateFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly filmRepository: FilmRepository,
    private readonly dateUtil: DateUtil,
    private readonly moviesService: MoviesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminUpdateFilmCommandHandler.name);
  }
  async execute(
    command: AdminUpdateFilmCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { filmId, inputDto } = command;
    this.logger.log(`Update film by admin command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const film = await this.filmRepository.getFilmById(filmId);

      if (!film)
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });

      const { genres: rawGenres, releaseDate } = inputDto;

      const genres =
        rawGenres && rawGenres.length > 0
          ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
          : [];

      const updateDto: FilmUpdateDto = {
        ...inputDto,
        releaseDate: this.dateUtil.formatDateYyMmDd(releaseDate),
        genres,
      };

      film.update(updateDto);

      await this.filmRepository.save(film, queryRunner);
      await queryRunner.commitTransaction();
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }
}

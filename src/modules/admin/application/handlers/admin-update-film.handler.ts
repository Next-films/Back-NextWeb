import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { AdminUpdateFilmInputDto } from '@/admin/api/dtos/input/admin-update-film.input.dto';
import { MoviesService } from '@/movies/application/movies.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { FilmUpdateDto } from '@/films/domain/types';
import { DateUtil } from '@/common/utils/date.util';
import { MovieTypesEnum } from '@/common/types/types';
import { Film } from '@/films/domain/film.entity';
import { MovieHandleStatus, UploadedFilesUrlResult } from '@/movies/domain/types';

const VIDEO_UPLOAD_INPUT_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mpeg',
  'video/quicktime',
  'video/x-matroska',
  'video/x-ms-wmv',
];

const POSTER_UPLOAD_INPUT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const LOGO_UPLOAD_INPUT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const BACKGROUND_UPLOAD_INPUT_MIME_TYPES = [
  ...VIDEO_UPLOAD_INPUT_MIME_TYPES,
  ...POSTER_UPLOAD_INPUT_MIME_TYPES,
];

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
      AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
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
  ): Promise<AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>> {
    const { filmId, inputDto } = command;
    this.logger.log(`Update film by admin command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const film = await this.filmRepository.getFilmById(filmId, queryRunner);

      if (!film) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'filmId',
          message: 'Film not found',
          errorKey: EXCEPTION_KEYS_ENUM.FILM_NOT_FOUND,
        });
      }

      const validateFileResult = this.validateFileResult(inputDto, film);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const mergedInputDto: AdminUpdateFilmInputDto = {
        ...inputDto,
        videUrl: inputDto.videUrl ?? film.videoUrl ?? undefined,
        backgroundContentUrl:
          inputDto.backgroundContentUrl ?? film.backgroundContentUrl ?? undefined,
        previewUrl: inputDto.previewUrl ?? film.previewUrl ?? undefined,
        titleUrl: inputDto.titleUrl ?? film.titleUrl ?? undefined,
      };

      const {
        genres: rawGenres,
        releaseDate,
        titleFile,
        backgroundFile,
        previewFile,
        videoFile,
      } = mergedInputDto;

      const genres =
        rawGenres && rawGenres.length > 0
          ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
          : [];

      const updateDto: FilmUpdateDto = {
        ...mergedInputDto,
        releaseDate: this.dateUtil.formatDateYyMmDd(releaseDate),
        genres,
      };

      let uploadFileResult: UploadedFilesUrlResult | null = null;
      if (titleFile || backgroundFile || previewFile || videoFile) {
        uploadFileResult = await this.handleFile(
          film,
          videoFile,
          backgroundFile,
          previewFile,
          titleFile,
        );

        if (!uploadFileResult) {
          await queryRunner.rollbackTransaction();
          return this.appNotification.badRequest({
            errorsMessages: [
              {
                errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
                message:
                  'Failed to process uploaded file. Check file type/size or switch file to a supported format.',
                field: 'uploadedFile',
              },
            ],
          });
        }
      }

      if (uploadFileResult) {
        film.update(updateDto, uploadFileResult);
      } else {
        film.update(updateDto);
      }

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

  private validateFileResult(
    inputDto: AdminUpdateFilmInputDto,
    film: Film,
  ): ValidationErrorsDto | null {
    const errors: ValidationErrorsDto = {
      errorsMessages: [],
    };

    const {
      videoFile,
      backgroundFile,
      previewFile,
      titleFile,

      videUrl: incomingVideoUrl,
      backgroundContentUrl: incomingBackgroundContentUrl,
      previewUrl: incomingPreviewUrl,
      titleUrl: incomingTitleUrl,
    } = inputDto;

    const videUrl = incomingVideoUrl ?? film.videoUrl;
    const backgroundContentUrl = incomingBackgroundContentUrl ?? film.backgroundContentUrl;
    const previewUrl = incomingPreviewUrl ?? film.previewUrl;
    const titleUrl = incomingTitleUrl ?? film.titleUrl;

    if (!videoFile && !videUrl)
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.FILE_OR_URL_REQUIRE,
        message: 'A file or a link to a file is required!',
        field: 'videoFile_videUrl',
      });

    if (!backgroundFile && !backgroundContentUrl)
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.FILE_OR_URL_REQUIRE,
        message: 'A file or a link to a file is required!',
        field: 'backgroundFile_backgroundContentUrl',
      });

    if (!previewFile && !previewUrl)
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.FILE_OR_URL_REQUIRE,
        message: 'A file or a link to a file is required!',
        field: 'previewFile_previewUrl',
      });

    if (!titleFile && !titleUrl)
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.FILE_OR_URL_REQUIRE,
        message: 'A file or a link to a file is required!',
        field: 'titleFile_titleUrl',
      });

    if (
      videoFile &&
      (!videoFile.mimetype || !VIDEO_UPLOAD_INPUT_MIME_TYPES.includes(videoFile.mimetype))
    ) {
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
        message: `Invalid file type for videoFile. Allowed: ${VIDEO_UPLOAD_INPUT_MIME_TYPES.join(
          ', ',
        )}`,
        field: 'videoFile',
      });
    }

    if (
      previewFile &&
      (!previewFile.mimetype || !POSTER_UPLOAD_INPUT_MIME_TYPES.includes(previewFile.mimetype))
    ) {
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
        message: `Invalid file type for previewFile. Allowed: ${POSTER_UPLOAD_INPUT_MIME_TYPES.join(
          ', ',
        )}`,
        field: 'previewFile',
      });
    }

    if (
      titleFile &&
      (!titleFile.mimetype || !LOGO_UPLOAD_INPUT_MIME_TYPES.includes(titleFile.mimetype))
    ) {
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
        message: `Invalid file type for titleFile. Allowed: ${LOGO_UPLOAD_INPUT_MIME_TYPES.join(
          ', ',
        )}`,
        field: 'titleFile',
      });
    }

    if (
      backgroundFile &&
      (!backgroundFile.mimetype ||
        !BACKGROUND_UPLOAD_INPUT_MIME_TYPES.includes(backgroundFile.mimetype))
    ) {
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
        message: `Invalid file type for backgroundFile. Allowed: ${BACKGROUND_UPLOAD_INPUT_MIME_TYPES.join(
          ', ',
        )}`,
        field: 'backgroundFile',
      });
    }

    return errors.errorsMessages.length > 0 ? errors : null;
  }

  private async handleFile(
    film: Film,
    videoFile?: Express.Multer.File,
    backgroundFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    titleFile?: Express.Multer.File,
  ): Promise<UploadedFilesUrlResult | null> {
    const { id } = film;

    let backgroundMime: string = 'image/';
    let videoMime: string = 'image/';

    if (backgroundFile) backgroundMime = backgroundFile.mimetype as 'image/' | 'video/';
    if (videoFile) videoMime = videoFile.mimetype as 'image/' | 'video/';

    const [titleUrl, previewUrl, backgroundImgUrl, videoUrl] = await Promise.all([
      titleFile
        ? this.moviesService.getLogoUrl(titleFile, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),
      previewFile
        ? this.moviesService.getPosterUrl(previewFile, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),
      backgroundFile
        ? this.moviesService.getBackgroundContentUrl(backgroundFile, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),
      videoFile
        ? this.moviesService.getVideoContentUrl(videoFile, id, MovieTypesEnum.FILM)
        : Promise.resolve(null),
    ]);

    if (
      (titleFile && !titleUrl) ||
      (previewFile && !previewUrl) ||
      (backgroundFile && backgroundMime.startsWith('image/') && !backgroundImgUrl)
    )
      return null;

    if (
      (backgroundFile && backgroundMime.startsWith('video/')) ||
      (videoFile && videoMime.startsWith('video/'))
    ) {
      film.updateHandleStatus(MovieHandleStatus.PROCESSING);
    }

    return {
      titleUploadedUrl: titleUrl || null,
      previewUploadedUrl: previewUrl || null,
      backgroundUploadedUrl: backgroundImgUrl || null,
      videoUploadedUrl: videoUrl || null,
    };
  }
}

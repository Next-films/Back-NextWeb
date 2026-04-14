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

const HORIZONTAL_PREVIEW_UPLOAD_INPUT_MIME_TYPES = [...POSTER_UPLOAD_INPUT_MIME_TYPES];

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

      const validateFileResult = this.validateFileResult(inputDto);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const uploadedBackgroundContentUrl = await this.uploadBackgroundUrlByInput(
        film,
        inputDto.backgroundContentUrl,
      );

      if (typeof inputDto.backgroundContentUrl === 'string' && !uploadedBackgroundContentUrl) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorsMessages: [
            {
              errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
              message:
                'Failed to upload background content to file storage. Verify URL/file and retry.',
              field: 'backgroundContentUrl',
            },
          ],
        });
      }

      const uploadedHorizontalPreviewUrl = await this.uploadHorizontalPreviewUrlByInput(
        film,
        inputDto.horizontalPreviewUrl,
      );

      if (typeof inputDto.horizontalPreviewUrl === 'string' && !uploadedHorizontalPreviewUrl) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorsMessages: [
            {
              errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
              message:
                'Failed to upload horizontal preview to file storage. Verify URL/file and retry.',
              field: 'horizontalPreviewUrl',
            },
          ],
        });
      }

      const mergedInputDto: AdminUpdateFilmInputDto = {
        ...inputDto,
        videUrl: inputDto.videUrl ?? film.videoUrl ?? undefined,
        backgroundContentUrl:
          uploadedBackgroundContentUrl ??
          inputDto.backgroundContentUrl ??
          film.backgroundContentUrl ??
          undefined,
        horizontalPreviewUrl:
          uploadedHorizontalPreviewUrl ??
          inputDto.horizontalPreviewUrl ??
          film.horizontalPreviewUrl ??
          undefined,
        previewUrl: inputDto.previewUrl ?? film.previewUrl ?? undefined,
        titleUrl: inputDto.titleUrl ?? film.titleUrl ?? undefined,
      };

      const {
        genres: rawGenres,
        releaseDate,
        titleFile,
        backgroundFile,
        horizontalPreviewFile,
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
      if (titleFile || backgroundFile || horizontalPreviewFile || previewFile || videoFile) {
        try {
          uploadFileResult = await this.handleFile(
            film,
            videoFile,
            backgroundFile,
            horizontalPreviewFile,
            previewFile,
            titleFile,
          );
        } catch (error) {
          await queryRunner.rollbackTransaction();
          const details =
            error instanceof Error ? error.message : 'Unknown upload processing error';

          return this.appNotification.badRequest({
            errorsMessages: [
              {
                errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
                message: `Failed to process uploaded file: ${details}`,
                field: 'uploadedFile',
              },
            ],
          });
        }

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

  private validateFileResult(inputDto: AdminUpdateFilmInputDto): ValidationErrorsDto | null {
    const errors: ValidationErrorsDto = {
      errorsMessages: [],
    };

    const { videoFile, backgroundFile, horizontalPreviewFile, previewFile, titleFile } = inputDto;

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

    if (
      horizontalPreviewFile &&
      (!horizontalPreviewFile.mimetype ||
        !HORIZONTAL_PREVIEW_UPLOAD_INPUT_MIME_TYPES.includes(horizontalPreviewFile.mimetype))
    ) {
      errors.errorsMessages.push({
        errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
        message: `Invalid file type for horizontalPreviewFile. Allowed: ${HORIZONTAL_PREVIEW_UPLOAD_INPUT_MIME_TYPES.join(
          ', ',
        )}`,
        field: 'horizontalPreviewFile',
      });
    }

    return errors.errorsMessages.length > 0 ? errors : null;
  }

  private async handleFile(
    film: Film,
    videoFile?: Express.Multer.File,
    backgroundFile?: Express.Multer.File,
    horizontalPreviewFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    titleFile?: Express.Multer.File,
  ): Promise<UploadedFilesUrlResult | null> {
    const { id } = film;

    let backgroundMime: string = 'image/';
    let videoMime: string = 'image/';

    if (backgroundFile) backgroundMime = backgroundFile.mimetype as 'image/' | 'video/';
    if (videoFile) videoMime = videoFile.mimetype as 'image/' | 'video/';

    const [titleUrl, previewUrl, horizontalPreviewUrl, backgroundImgUrl, videoUrl] =
      await Promise.all([
        titleFile
          ? this.moviesService.getLogoUrl(titleFile, id, MovieTypesEnum.FILM)
          : Promise.resolve(null),
        previewFile
          ? this.moviesService.getPosterUrl(previewFile, id, MovieTypesEnum.FILM)
          : Promise.resolve(null),
        horizontalPreviewFile
          ? this.moviesService.getBackgroundContentUrl(
              horizontalPreviewFile,
              id,
              MovieTypesEnum.FILM,
              'horizontal-posters',
            )
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
      (horizontalPreviewFile && !horizontalPreviewUrl) ||
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
      horizontalPreviewUploadedUrl: horizontalPreviewUrl || null,
      backgroundUploadedUrl: backgroundImgUrl || null,
      videoUploadedUrl: videoUrl || null,
    };
  }

  private async uploadBackgroundUrlByInput(
    film: Film,
    backgroundContentUrl?: string,
  ): Promise<string | null | undefined> {
    if (typeof backgroundContentUrl !== 'string') return undefined;

    const normalizedBackgroundContentUrl = backgroundContentUrl.trim();
    if (!normalizedBackgroundContentUrl) return null;

    if (normalizedBackgroundContentUrl === film.backgroundContentUrl) {
      return film.backgroundContentUrl;
    }

    return this.moviesService.getBackgroundContentUrl(
      normalizedBackgroundContentUrl,
      film.id,
      MovieTypesEnum.FILM,
    );
  }

  private async uploadHorizontalPreviewUrlByInput(
    film: Film,
    horizontalPreviewUrl?: string,
  ): Promise<string | null | undefined> {
    if (typeof horizontalPreviewUrl !== 'string') return undefined;

    const normalizedHorizontalPreviewUrl = horizontalPreviewUrl.trim();
    if (!normalizedHorizontalPreviewUrl) return null;

    if (this.isLikelyVideoSourceUrl(normalizedHorizontalPreviewUrl)) return null;

    if (normalizedHorizontalPreviewUrl === film.horizontalPreviewUrl) {
      return film.horizontalPreviewUrl;
    }

    return this.moviesService.getBackgroundContentUrl(
      normalizedHorizontalPreviewUrl,
      film.id,
      MovieTypesEnum.FILM,
      'horizontal-posters',
    );
  }

  private isLikelyVideoSourceUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('youtube.com') ||
      lowerUrl.includes('youtube-nocookie.com')
    ) {
      return true;
    }

    return (
      lowerUrl.includes('.mp4') ||
      lowerUrl.includes('.webm') ||
      lowerUrl.includes('.mov') ||
      lowerUrl.includes('.avi') ||
      lowerUrl.includes('.mkv') ||
      lowerUrl.includes('.mpeg') ||
      lowerUrl.includes('.mpg') ||
      lowerUrl.includes('.ogg') ||
      lowerUrl.includes('.wmv')
    );
  }
}

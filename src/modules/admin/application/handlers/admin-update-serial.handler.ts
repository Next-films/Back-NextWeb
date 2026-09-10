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
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { AdminUpdateSerialInputDto } from '@/admin/api/dtos/input/admin-update-serial.input.dto';
import { MoviesService } from '@/movies/application/movies.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { SerialUpdateDto } from '@/serials/domain/types';
import { DateUtil } from '@/common/utils/date.util';
import { MovieTypesEnum } from '@/common/types/types';
import { Serial } from '@/serials/domain/serial.entity';
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

export class AdminUpdateSerialCommand implements ICommand {
  constructor(
    public serialId: number,
    public inputDto: AdminUpdateSerialInputDto,
  ) {}
}

@CommandHandler(AdminUpdateSerialCommand)
export class AdminUpdateSerialCommandHandler
  implements
    ICommandHandler<
      AdminUpdateSerialCommand,
      AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly serialRepository: SerialRepository,
    private readonly dateUtil: DateUtil,
    private readonly moviesService: MoviesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminUpdateSerialCommandHandler.name);
  }
  async execute(
    command: AdminUpdateSerialCommand,
  ): Promise<AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>> {
    const { serialId, inputDto } = command;
    this.logger.log(`Update serial by admin command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const serial = await this.serialRepository.getSerialById(serialId, queryRunner);

      if (!serial) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });
      }

      const validateFileResult = this.validateFileResult(inputDto);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const uploadedBackgroundContentUrl = await this.uploadBackgroundUrlByInput(
        serial,
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

      const mergedInputDto: AdminUpdateSerialInputDto = {
        ...inputDto,
        videUrl: inputDto.videUrl ?? serial.videoUrl ?? undefined,
        trailerUrl: inputDto.trailerUrl ?? serial.trailerUrl ?? undefined,
        backgroundContentUrl:
          uploadedBackgroundContentUrl ??
          inputDto.backgroundContentUrl ??
          serial.backgroundContentUrl ??
          undefined,
        previewUrl: inputDto.previewUrl ?? serial.previewUrl ?? undefined,
        titleUrl: inputDto.titleUrl ?? serial.titleUrl ?? undefined,
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

      const updateDto: SerialUpdateDto = {
        ...mergedInputDto,
        horizontalPreviewUrl: null,
        releaseDate: this.dateUtil.formatDateYyMmDd(releaseDate),
        genres,
      };

      let uploadFileResult: UploadedFilesUrlResult | null = null;
      if (titleFile || backgroundFile || previewFile || videoFile) {
        uploadFileResult = await this.handleFile(
          serial,
          videoFile,
          backgroundFile,
          previewFile,
          titleFile,
        );

        if (!uploadFileResult) {
          await queryRunner.rollbackTransaction();
          return this.appNotification.internalServerError();
        }
      }

      if (uploadFileResult) {
        serial.update(updateDto, uploadFileResult);
      } else {
        serial.update(updateDto);
      }

      await this.serialRepository.save(serial, queryRunner);
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

  private validateFileResult(inputDto: AdminUpdateSerialInputDto): ValidationErrorsDto | null {
    const errors: ValidationErrorsDto = {
      errorsMessages: [],
    };

    const { videoFile, backgroundFile, previewFile, titleFile } = inputDto;

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
    serial: Serial,
    videoFile?: Express.Multer.File,
    backgroundFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    titleFile?: Express.Multer.File,
  ): Promise<UploadedFilesUrlResult | null> {
    const { id } = serial;

    let backgroundMime: string = 'image/';
    let videoMime: string = 'image/';

    if (backgroundFile) backgroundMime = backgroundFile.mimetype as 'image/' | 'video/';
    if (videoFile) videoMime = videoFile.mimetype as 'image/' | 'video/';

    const [titleUrl, previewUrl, backgroundImgUrl, videoUrl] = await Promise.all([
      titleFile
        ? this.moviesService.getLogoUrl(titleFile, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),
      previewFile
        ? this.moviesService.getPosterUrl(previewFile, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),
      backgroundFile
        ? this.moviesService.getBackgroundContentUrl(backgroundFile, id, MovieTypesEnum.SERIAL)
        : Promise.resolve(null),
      videoFile
        ? this.moviesService.getVideoContentUrl(videoFile, id, MovieTypesEnum.SERIAL)
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
      serial.updateHandleStatus(MovieHandleStatus.PROCESSING);
    }

    return {
      titleUploadedUrl: titleUrl || null,
      previewUploadedUrl: previewUrl || null,
      backgroundUploadedUrl: backgroundImgUrl || null,
      videoUploadedUrl: videoUrl || null,
    };
  }

  private async uploadBackgroundUrlByInput(
    serial: Serial,
    backgroundContentUrl?: string,
  ): Promise<string | null | undefined> {
    if (typeof backgroundContentUrl !== 'string') return undefined;

    const normalizedBackgroundContentUrl = backgroundContentUrl.trim();
    if (!normalizedBackgroundContentUrl) return null;

    if (normalizedBackgroundContentUrl === serial.backgroundContentUrl) {
      return serial.backgroundContentUrl;
    }

    return this.moviesService.getBackgroundContentUrl(
      normalizedBackgroundContentUrl,
      serial.id,
      MovieTypesEnum.SERIAL,
    );
  }
}

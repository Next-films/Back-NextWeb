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

      const validateFileResult = this.validateFileResult(inputDto);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const serial = await this.serialRepository.getSerialById(serialId, queryRunner);

      if (!serial) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });
      }

      const {
        genres: rawGenres,
        releaseDate,
        titleFile,
        backgroundFile,
        previewFile,
        videoFile,
      } = inputDto;

      const genres =
        rawGenres && rawGenres.length > 0
          ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
          : [];

      const updateDto: SerialUpdateDto = {
        ...inputDto,
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

    const {
      videoFile,
      backgroundFile,
      previewFile,
      titleFile,

      videUrl,
      backgroundContentUrl,
      previewUrl,
      titleUrl,
    } = inputDto;

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
}

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
import { MoviesService } from '@/movies/application/movies.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DateUtil } from '@/common/utils/date.util';
import { AdminUpdateCartoonInputDto } from '@/admin/api/dtos/input/admin-update-cartoon.input.dto';
import { CartonUpdateDto } from '@/cartoons/domain/types';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { AdminUpdateFilmInputDto } from '@/admin/api/dtos/input/admin-update-film.input.dto';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieHandleStatus, UploadedFilesUrlResult } from '@/movies/domain/types';

export class AdminUpdateCartoonCommand implements ICommand {
  constructor(
    public cartoonId: number,
    public inputDto: AdminUpdateCartoonInputDto,
  ) {}
}

@CommandHandler(AdminUpdateCartoonCommand)
export class AdminUpdateCartoonCommandHandler
  implements
    ICommandHandler<
      AdminUpdateCartoonCommand,
      AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly cartoonRepository: CartoonRepository,
    private readonly dateUtil: DateUtil,
    private readonly moviesService: MoviesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminUpdateCartoonCommandHandler.name);
  }
  async execute(
    command: AdminUpdateCartoonCommand,
  ): Promise<AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>> {
    const { cartoonId, inputDto } = command;
    this.logger.log(`Update cartoon by admin command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId, queryRunner);

      if (!cartoon) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });
      }

      const validateFileResult = this.validateFileResult(inputDto);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const uploadedBackgroundContentUrl = await this.uploadBackgroundUrlByInput(
        cartoon,
        inputDto.backgroundContentUrl,
      );

      if (typeof inputDto.backgroundContentUrl === 'string' && !uploadedBackgroundContentUrl) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorsMessages: [
            {
              errorKey: EXCEPTION_KEYS_ENUM.backgroundContentUrl,
              message:
                'Failed to upload horizontal preview to file storage. Verify URL/file and retry.',
              field: 'backgroundContentUrl',
            },
          ],
        });
      }

      const mergedInputDto: AdminUpdateCartoonInputDto = {
        ...inputDto,
        videUrl: inputDto.videUrl ?? cartoon.videoUrl ?? undefined,
        backgroundContentUrl:
          uploadedBackgroundContentUrl ??
          inputDto.backgroundContentUrl ??
          cartoon.backgroundContentUrl ??
          undefined,
        previewUrl: inputDto.previewUrl ?? cartoon.previewUrl ?? undefined,
        titleUrl: inputDto.titleUrl ?? cartoon.titleUrl ?? undefined,
      };

      const { genres: rawGenres, releaseDate } = mergedInputDto;

      const genres =
        rawGenres && rawGenres.length > 0
          ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
          : [];

      const updateDto: CartonUpdateDto = {
        ...mergedInputDto,
        releaseDate: this.dateUtil.formatDateYyMmDd(releaseDate),
        genres,
      };

      let uploadFileResult: UploadedFilesUrlResult | null = null;
      if (
        mergedInputDto.titleFile ||
        mergedInputDto.backgroundFile ||
        mergedInputDto.previewFile ||
        mergedInputDto.videoFile
      ) {
        uploadFileResult = await this.handleFile(
          cartoon,
          mergedInputDto.videoFile,
          mergedInputDto.backgroundFile,
          mergedInputDto.previewFile,
          mergedInputDto.titleFile,
        );

        if (!uploadFileResult) {
          await queryRunner.rollbackTransaction();
          return this.appNotification.internalServerError();
        }
      }

      if (uploadFileResult) {
        cartoon.update(updateDto, uploadFileResult);
      } else {
        cartoon.update(updateDto);
      }

      await this.cartoonRepository.save(cartoon, queryRunner);
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
    void inputDto;
    return null;
  }

  private async handleFile(
    cartoon: Cartoon,
    videoFile?: Express.Multer.File,
    backgroundFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
    titleFile?: Express.Multer.File,
  ): Promise<UploadedFilesUrlResult | null> {
    const { id } = cartoon;

    let backgroundMime: string = 'image/';
    let videoMime: string = 'image/';

    if (backgroundFile) backgroundMime = backgroundFile.mimetype as 'image/' | 'video/';
    if (videoFile) videoMime = videoFile.mimetype as 'image/' | 'video/';

    const [titleUrl, previewUrl, backgroundImgUrl, videoUrl] = await Promise.all([
      titleFile
        ? this.moviesService.getLogoUrl(titleFile, id, MovieTypesEnum.CARTOON)
        : Promise.resolve(null),
      previewFile
        ? this.moviesService.getPosterUrl(previewFile, id, MovieTypesEnum.CARTOON)
        : Promise.resolve(null),
      backgroundFile
        ? this.moviesService.getBackgroundContentUrl(backgroundFile, id, MovieTypesEnum.CARTOON)
        : Promise.resolve(null),
      videoFile
        ? this.moviesService.getVideoContentUrl(videoFile, id, MovieTypesEnum.CARTOON)
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
      cartoon.updateHandleStatus(MovieHandleStatus.PROCESSING);
    }

    return {
      titleUploadedUrl: titleUrl || null,
      previewUploadedUrl: previewUrl || null,
      backgroundUploadedUrl: backgroundImgUrl || null,
      videoUploadedUrl: videoUrl || null,
    };
  }

  private async uploadBackgroundUrlByInput(
    cartoon: Cartoon,
    backgroundContentUrl?: string,
  ): Promise<string | null | undefined> {
    if (typeof backgroundContentUrl !== 'string') return undefined;

    const normalizedBackgroundContentUrl = backgroundContentUrl.trim();
    if (!normalizedBackgroundContentUrl) return null;

    if (normalizedBackgroundContentUrl === cartoon.backgroundContentUrl) {
      return cartoon.backgroundContentUrl;
    }

    return this.moviesService.getBackgroundContentUrl(
      normalizedBackgroundContentUrl,
      cartoon.id,
      MovieTypesEnum.CARTOON,
    );
  }
}

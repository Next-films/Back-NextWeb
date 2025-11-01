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

      const validateFileResult = this.validateFileResult(inputDto);

      if (validateFileResult) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest(validateFileResult);
      }

      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId, queryRunner);

      if (!cartoon) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });
      }

      const { genres: rawGenres, releaseDate } = inputDto;

      const genres =
        rawGenres && rawGenres.length > 0
          ? await this.moviesService.getOrCreateGenre(rawGenres, queryRunner)
          : [];

      const updateDto: CartonUpdateDto = {
        ...inputDto,
        releaseDate: this.dateUtil.formatDateYyMmDd(releaseDate),
        genres,
      };

      cartoon.update(updateDto);

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
}

import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { MoviesService } from '@/movies/application/movies.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DateUtil } from '@/common/utils/date.util';
import { AdminUpdateCartoonInputDto } from '@/admin/api/dtos/input/admin-update-cartoon.input.dto';
import { CartonUpdateDto } from '@/cartoons/domain/types';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';

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
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
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
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { cartoonId, inputDto } = command;
    this.logger.log(`Update cartoon by admin command`, this.execute.name);
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId);

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
}

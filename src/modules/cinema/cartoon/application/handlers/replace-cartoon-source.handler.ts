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
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { MovieHandleStatus } from '@/movies/domain/types';
import { ReplaceMovieSourcePayloadDto } from '@/movies/api/dtos/input/replace-movie-source.input.dto';
import { ReplaceMovieSourceOutputDto } from '@/movies/api/dtos/output/replace-movie-source.output.dto';

export class ReplaceCartoonSourceCommand implements ICommand {
  constructor(public inputDto: ReplaceMovieSourcePayloadDto) {}
}

@CommandHandler(ReplaceCartoonSourceCommand)
export class ReplaceCartoonSourceCommandHandler
  implements
    ICommandHandler<
      ReplaceCartoonSourceCommand,
      AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly cartoonRepository: CartoonRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(ReplaceCartoonSourceCommandHandler.name);
  }

  async execute(
    command: ReplaceCartoonSourceCommand,
  ): Promise<AppNotificationResult<ReplaceMovieSourceOutputDto, ErrorFieldExceptionDto | null>> {
    const { kpId, key, duration } = command.inputDto;
    this.logger.log('Replace cartoon source command', this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const cartoon = await this.cartoonRepository.getCartoonByKinopoiskId(kpId, queryRunner);

      if (!cartoon) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.notFound({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
          message: 'Cartoon not found',
          field: 'kpId',
        });
      }

      // Повторный вызов с тем же ключом: нужное состояние уже достигнуто.
      // Отдаём success и previousVideoUrl = null — вызывающей стороне нечего удалять,
      // иначе она снесёт файл, который прямо сейчас играет.
      if (cartoon.videoUrl === key) {
        await queryRunner.commitTransaction();

        return this.appNotification.success({ previousVideoUrl: null });
      }

      // Мультфильм на модерации — там уже идёт ручная работа, не вмешиваемся.
      if (cartoon.handleStatus === MovieHandleStatus.MODERATE) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_ON_MODERATION,
          message: 'Cartoon is on moderation, source replacement is not allowed',
          field: 'kpId',
        });
      }

      // Нечего заменять: мультфильм ещё не опубликован. Это штатный случай для new-cartoon.
      if (cartoon.handleStatus !== MovieHandleStatus.PRODUCTION || !cartoon.videoUrl) {
        await queryRunner.rollbackTransaction();

        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_SOURCE_NOT_REPLACEABLE,
          message: 'Cartoon has no published source to replace, use new-cartoon instead',
          field: 'kpId',
        });
      }

      const previousVideoUrl = cartoon.videoUrl;

      // Меняем только источник. Метаданные, постеры, жанры и статус не трогаем:
      // мультфильм уже прошёл модерацию, для зрителя меняется лишь файл.
      cartoon.replaceVideoSource(key, duration || 0);

      await this.cartoonRepository.save(cartoon, queryRunner);
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

import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';

export class AdminRemoveSerialCommand implements ICommand {
  constructor(public serialId: number) {}
}

@CommandHandler(AdminRemoveSerialCommand)
export class AdminRemoveSerialCommandHandler
  implements
    ICommandHandler<
      AdminRemoveSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly serialRepository: SerialRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
  ) {
    this.logger.setContext(AdminRemoveSerialCommandHandler.name);
  }
  async execute(
    command: AdminRemoveSerialCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Remove serial by admin command`, this.execute.name);
    const { serialId } = command;
    try {
      const serial = await this.serialRepository.getSerialById(serialId);

      if (!serial)
        return this.appNotification.notFound({
          field: 'serialId',
          message: 'Serial not found',
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
        });

      const { videoUrl } = serial;

      if (videoUrl) {
        const key = videoUrl.replace(/^https?:\/\/[^/]+\//, '');
        await this.rmqResultHandlerUtil.getRmqData(
          () => this.downloaderServiceAdapter.removeMovie(key),
          'Remove serial',
        );
      }

      await this.serialRepository.remove(serial);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

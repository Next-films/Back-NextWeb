import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';

export class AdminRemoveCartoonCommand implements ICommand {
  constructor(public cartoonId: number) {}
}

@CommandHandler(AdminRemoveCartoonCommand)
export class AdminRemoveCartoonCommandHandler
  implements
    ICommandHandler<
      AdminRemoveCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly cartoonRepository: CartoonRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
  ) {
    this.logger.setContext(AdminRemoveCartoonCommandHandler.name);
  }
  async execute(
    command: AdminRemoveCartoonCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`Remove cartoon by admin command`, this.execute.name);
    const { cartoonId } = command;
    try {
      const cartoon = await this.cartoonRepository.getCartoonById(cartoonId);

      if (!cartoon)
        return this.appNotification.notFound({
          field: 'cartoonId',
          message: 'Cartoon not found',
          errorKey: EXCEPTION_KEYS_ENUM.CARTOON_NOT_FOUND,
        });

      const { videoUrl } = cartoon;

      if (videoUrl) {
        const key = videoUrl.replace(/^https?:\/\/[^/]+\//, '');
        await this.rmqResultHandlerUtil.getRmqData(
          () => this.downloaderServiceAdapter.removeMovie(key),
          'Remove cartoon',
        );
      }

      await this.cartoonRepository.remove(cartoon);

      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

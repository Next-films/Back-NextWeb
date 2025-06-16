import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { DOWNLOAD_SERVICE_RMQ_NAME } from '@/common/constants/rmq.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';

@Injectable()
export class DownloaderServiceAdapter {
  constructor(
    @Inject(DOWNLOAD_SERVICE_RMQ_NAME) private readonly client: ClientProxy,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DownloaderServiceAdapter.name);
  }
}

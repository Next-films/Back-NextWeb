import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  BRIDGE_DOWNLOAD_CARTOONS_CMD,
  BRIDGE_DOWNLOAD_FILMS_CMD,
  BRIDGE_DOWNLOAD_SERIALS_CMD,
  BRIDGE_FIND_CARTOONS_CMD,
  BRIDGE_FIND_FILMS_CMD,
  BRIDGE_FIND_SERIALS_CMD,
  DOWNLOAD_SERVICE_RMQ_NAME,
} from '@/common/constants/rmq.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';

@Injectable()
export class DownloaderServiceAdapter {
  constructor(
    @Inject(DOWNLOAD_SERVICE_RMQ_NAME) private readonly client: ClientProxy,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DownloaderServiceAdapter.name);
  }

  /*
   *
   *  Bridges to download service
   *
   */
  bridgeFindFilms(): void {
    this.client.emit({ cmd: BRIDGE_FIND_FILMS_CMD }, {});
  }

  bridgeDownloadFilms(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_FILMS_CMD }, {});
  }

  bridgeFindCartoons(): void {
    this.client.emit({ cmd: BRIDGE_FIND_CARTOONS_CMD }, {});
  }

  bridgeDownloadCartoons(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_CARTOONS_CMD }, {});
  }

  bridgeFindSerials(): void {
    this.client.emit({ cmd: BRIDGE_FIND_SERIALS_CMD }, {});
  }

  bridgeDownloadSerials(): void {
    this.client.emit({ cmd: BRIDGE_DOWNLOAD_SERIALS_CMD }, {});
  }
}

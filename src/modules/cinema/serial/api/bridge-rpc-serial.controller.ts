import { Controller, Get, UseGuards } from '@nestjs/common';
import { BRIDGE_RMG_SERIALS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { SwaggerDecoratorBridgeRpcDownloadSerials } from '@/serials/api/swagger/bridge-rpc-download-serials.swagger.decorator';
import { SwaggerDecoratorBridgeRpcFindSerials } from '@/serials/api/swagger/bridge-rpc-find-serials.swagger.decorator';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@ApiTags('Bridge rmq - serials')
@Controller(BRIDGE_RMG_SERIALS_ROUTE.MAIN)
export class SerialsBridgeRmqController {
  constructor(
    private readonly logger: LoggerService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(SerialsBridgeRmqController.name);
  }

  @Get(BRIDGE_RMG_SERIALS_ROUTE.FIND)
  @SwaggerDecoratorBridgeRpcFindSerials()
  bridgeFindSerials(): void {
    this.logger.log(`Execute: Find serials (Rmq bridge)`, this.bridgeFindSerials.name);
    this.downloaderServiceAdapter.bridgeFindSerials();
  }

  @Get(BRIDGE_RMG_SERIALS_ROUTE.DOWNLOAD)
  @SwaggerDecoratorBridgeRpcDownloadSerials()
  bridgeDownloadSerials(): void {
    this.logger.log(`Execute: Download serials (Rmq bridge)`, this.bridgeDownloadSerials.name);
    this.downloaderServiceAdapter.bridgeDownloadSerials();
  }
}

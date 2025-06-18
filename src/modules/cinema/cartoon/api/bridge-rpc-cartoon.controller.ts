import { Controller, Get, UseGuards } from '@nestjs/common';
import { BRIDGE_RMG_CARTOON_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { SwaggerDecoratorBridgeRpcFindCartoon } from '@/cartoons/api/swagger/bridge-rpc-find-cartoon.swagger.decorator';
import { SwaggerDecoratorBridgeRpcDownloadCartoons } from '@/cartoons/api/swagger/bridge-rpc-download-cartoon.swagger.decorator';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@ApiTags('Bridge rmq - cartoon')
@Controller(BRIDGE_RMG_CARTOON_ROUTE.MAIN)
export class CartoonBridgeRmqController {
  constructor(
    private readonly logger: LoggerService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(CartoonBridgeRmqController.name);
  }

  @Get(BRIDGE_RMG_CARTOON_ROUTE.FIND)
  @SwaggerDecoratorBridgeRpcFindCartoon()
  bridgeFindCartoon(): void {
    this.logger.log(`Execute: Find cartoon (Rmq bridge)`, this.bridgeFindCartoon.name);
    this.downloaderServiceAdapter.bridgeFindCartoons();
  }

  @Get(BRIDGE_RMG_CARTOON_ROUTE.DOWNLOAD)
  @SwaggerDecoratorBridgeRpcDownloadCartoons()
  bridgeDownloadCartoon(): void {
    this.logger.log(`Execute: Download cartoon (Rmq bridge)`, this.bridgeDownloadCartoon.name);
    this.downloaderServiceAdapter.bridgeDownloadCartoons();
  }
}

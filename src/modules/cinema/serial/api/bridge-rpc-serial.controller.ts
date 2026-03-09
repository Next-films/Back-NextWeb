import { Controller, Get, UseGuards } from '@nestjs/common';
import { BRIDGE_RMG_SERIALS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { SwaggerDecoratorBridgeRpcDownloadSerials } from '@/serials/api/swagger/bridge-rpc-download-serials.swagger.decorator';
import { SwaggerDecoratorBridgeRpcFindSerials } from '@/serials/api/swagger/bridge-rpc-find-serials.swagger.decorator';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ApiDeprecated } from '@/common/decorators/api-deprecated.swagger.decorator';

// TODO: Не настроена логика в сервисе скачивания
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@ApiTags(
  'Bridge rmq - serials. Used to manually trigger process in the download service. In development.',
)
@Controller(BRIDGE_RMG_SERIALS_ROUTE.MAIN)
export class SerialsBridgeRmqController {
  constructor(
    private readonly logger: LoggerService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(SerialsBridgeRmqController.name);
  }

  // TODO:
  @ApiDeprecated()
  @Get(BRIDGE_RMG_SERIALS_ROUTE.FIND)
  @SwaggerDecoratorBridgeRpcFindSerials()
  async bridgeFindSerials(): Promise<void> {
    this.logger.log(`Execute: Find serials (Rmq bridge)`, this.bridgeFindSerials.name);
    await this.downloaderServiceAdapter.bridgeFindSerials();
  }

  // TODO:
  @ApiDeprecated()
  @Get(BRIDGE_RMG_SERIALS_ROUTE.DOWNLOAD)
  @SwaggerDecoratorBridgeRpcDownloadSerials()
  async bridgeDownloadSerials(): Promise<void> {
    this.logger.log(`Execute: Download serials (Rmq bridge)`, this.bridgeDownloadSerials.name);
    await this.downloaderServiceAdapter.bridgeDownloadSerials();
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { BRIDGE_RMG_FILMS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { SwaggerDecoratorBridgeRpcFindFilms } from '@/films/api/swagger/bridge-rpc-find-films.swagger.decorator';
import { SwaggerDecoratorBridgeRpcDownloadFilms } from '@/films/api/swagger/bridge-rpc-download-films.swagger.decorator';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@ApiTags('Bridge rmq - films. Used to manually trigger process in the download service.')
@Controller(BRIDGE_RMG_FILMS_ROUTE.MAIN)
export class FilmBridgeRmqController {
  constructor(
    private readonly logger: LoggerService,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
  ) {
    this.logger.setContext(FilmBridgeRmqController.name);
  }

  @Get(BRIDGE_RMG_FILMS_ROUTE.FIND)
  @SwaggerDecoratorBridgeRpcFindFilms()
  async bridgeFindFilms(): Promise<void> {
    this.logger.log(`Execute: Find films (Rmq bridge)`, this.bridgeFindFilms.name);
    await this.downloaderServiceAdapter.bridgeFindFilms();
  }

  @Get(BRIDGE_RMG_FILMS_ROUTE.DOWNLOAD)
  @SwaggerDecoratorBridgeRpcDownloadFilms()
  async bridgeDownloadFilms(): Promise<void> {
    this.logger.log(`Execute: Download films (Rmq bridge)`, this.bridgeDownloadFilms.name);
    await this.downloaderServiceAdapter.bridgeDownloadFilms();
  }
}

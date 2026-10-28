import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Param,
  Res,
  StreamableFile,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { YoutubeMonitorService } from '../application/services/youtube-monitor.service';
import { YoutubeProcessingService } from '../application/services/youtube-processing.service';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import {
  AdminYoutubeSourcesInputDto,
  AdminYoutubeVideosQueryDto,
} from './dtos/input/admin-youtube-monitor.input.dto';

@ApiTags('Admin cinema - YouTube monitoring')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/youtube`)
export class AdminYoutubeMonitorController {
  constructor(
    private readonly monitor: YoutubeMonitorService,
    private readonly processing: YoutubeProcessingService,
  ) {}

  @Get('videos/:videoId/processing')
  processingStatus(@Param('videoId') videoId: string) {
    return this.processing.status(videoId);
  }

  @Delete('videos/:videoId/processing')
  removeFiles(@Param('videoId') videoId: string) {
    return this.processing.remove(videoId);
  }

  @Post('videos/:videoId/import')
  @HttpCode(HttpStatus.ACCEPTED)
  importShort(@Param('videoId') videoId: string, @Body() body: unknown) {
    return this.processing.download(videoId, body);
  }

  @Post('videos/:videoId/render')
  @HttpCode(HttpStatus.ACCEPTED)
  renderShort(@Param('videoId') videoId: string, @Body() body: unknown) {
    return this.processing.render(videoId, body);
  }

  @Get('videos/:videoId/files/:kind')
  async file(
    @Param('videoId') videoId: string,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const upstream = await this.processing.asset(videoId, kind);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `inline; filename="${videoId}-${kind}.mp4"`);
    const body = Readable.fromWeb(upstream.body as never);
    res.on('close', () => body.destroy());
    return new StreamableFile(body);
  }

  @Get()
  overview(@Query() query: AdminYoutubeVideosQueryDto) {
    return this.monitor.overview(query);
  }

  @Put('accounts')
  saveAccounts(@Body() input: AdminYoutubeSourcesInputDto) {
    return this.monitor.saveAccounts(input.accounts);
  }

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  sync() {
    return this.monitor.startSync();
  }
}

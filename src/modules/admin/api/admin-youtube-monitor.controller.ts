import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { YoutubeMonitorService } from '../application/services/youtube-monitor.service';
import {
  AdminYoutubeSourcesInputDto,
  AdminYoutubeVideosQueryDto,
} from './dtos/input/admin-youtube-monitor.input.dto';

@ApiTags('Admin cinema - YouTube monitoring')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/youtube`)
export class AdminYoutubeMonitorController {
  constructor(private readonly monitor: YoutubeMonitorService) {}

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

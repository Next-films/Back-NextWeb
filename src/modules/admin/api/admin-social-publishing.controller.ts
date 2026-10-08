import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { SocialPublishingService } from '@/admin/application/services/social-publishing.service';
import { SocialPublishingProvider } from '@/admin/domain/social-publishing-rule.entity';
import {
  AdminCreateSocialPublishingRuleInputDto,
  AdminUpdateSocialPublishingRuleInputDto,
} from '@/admin/api/dtos/input/admin-social-publishing.input.dto';

@ApiTags('Admin cinema - social publishing')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.SHORT_CONTENT}/publishing`)
export class AdminSocialPublishingController {
  constructor(private readonly socialPublishingService: SocialPublishingService) {}

  @Get('providers/:provider/projects')
  listProjects(@Param('provider') provider: SocialPublishingProvider) {
    return this.socialPublishingService.getProvider(provider).listProjects();
  }

  @Get('providers/:provider/projects/:projectId/accounts')
  listAccounts(
    @Param('provider') provider: SocialPublishingProvider,
    @Param('projectId', ParseIntPatchPipe) projectId: number,
  ) {
    return this.socialPublishingService.getProvider(provider).listAccounts(projectId);
  }

  @Get('rules')
  listRules() {
    return this.socialPublishingService.listRules();
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  createRule(@Body() body: AdminCreateSocialPublishingRuleInputDto) {
    return this.socialPublishingService.createRule(body);
  }

  @Patch('rules/:id')
  updateRule(
    @Param('id', ParseIntPatchPipe) id: number,
    @Body() body: AdminUpdateSocialPublishingRuleInputDto,
  ) {
    return this.socialPublishingService.updateRule(id, body);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRule(@Param('id', ParseIntPatchPipe) id: number): Promise<void> {
    return this.socialPublishingService.removeRule(id);
  }

  @Get('publications')
  listPublications() {
    return this.socialPublishingService.listPublications();
  }

  @Post('publications/:id/retry')
  retryPublication(@Param('id', ParseIntPatchPipe) id: number) {
    return this.socialPublishingService.retryPublication(id);
  }

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  runNow(): { success: true } {
    void this.socialPublishingService.tick();
    return { success: true };
  }
}

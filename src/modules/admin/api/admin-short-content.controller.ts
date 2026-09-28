import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminCreateShortContentDraftInputDto } from '@/admin/api/dtos/input/admin-create-short-content-draft.input.dto';
import { ShortContentClientService } from '@/admin/application/services/short-content-client.service';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ShortContentJob,
  ShortContentJobStatus,
  ShortContentType,
} from '@/admin/domain/short-content-job.entity';
import { ShortContentJobRepository } from '@/admin/infrastructure/short-content-job.repository';
import { AdminShortContentJobOutputDto } from '@/admin/api/dtos/output/admin-short-content-job.output.dto';
import { AdminGetShortContentJobsInputQueryDto } from '@/admin/api/dtos/input/admin-get-short-content-jobs.input-query.dto';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';

@ApiTags('Admin cinema - short content')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.SHORT_CONTENT}`)
export class AdminShortContentController {
  constructor(
    private readonly logger: LoggerService,
    private readonly shortContentClient: ShortContentClientService,
    private readonly shortContentJobRepository: ShortContentJobRepository,
  ) {
    this.logger.setContext(AdminShortContentController.name);
  }

  @Get()
  async getAll(
    @Query() query: AdminGetShortContentJobsInputQueryDto,
  ): Promise<AdminShortContentJobOutputDto[]> {
    this.logger.log('Execute: get short content jobs', this.getAll.name);
    const jobs = await this.shortContentJobRepository.findAll(query);

    return AdminShortContentJobOutputDto.fromEntities(jobs);
  }

  @Get(':jobId')
  async getById(
    @Param('jobId', ParseIntPatchPipe) jobId: number,
  ): Promise<AdminShortContentJobOutputDto> {
    this.logger.log(`Execute: get short content job by id: ${jobId}`, this.getById.name);
    const job = await this.getJobOrThrow(jobId);

    return AdminShortContentJobOutputDto.fromEntity(job);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('draft')
  async createDraft(
    @Body() body: AdminCreateShortContentDraftInputDto,
  ): Promise<AdminShortContentJobOutputDto> {
    this.logger.log('Execute: create short content draft', this.createDraft.name);
    const job = await this.shortContentJobRepository.save(
      ShortContentJob.create(
        body.contentType as ShortContentType,
        body.contentId,
        body as unknown as Record<string, unknown>,
      ),
    );

    try {
      const draft = (await this.shortContentClient.createDraft(body)) as Record<string, unknown>;
      job.markDrafted(draft);
    } catch (error) {
      job.markFailed(error instanceof Error ? error.message : String(error));
    }

    const saved = await this.shortContentJobRepository.save(job);

    return AdminShortContentJobOutputDto.fromEntity(saved);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':jobId/approve')
  async approve(
    @Param('jobId', ParseIntPatchPipe) jobId: number,
  ): Promise<AdminShortContentJobOutputDto> {
    this.logger.log(`Execute: approve short content job: ${jobId}`, this.approve.name);
    const job = await this.getJobOrThrow(jobId);

    if (job.status !== ShortContentJobStatus.DRAFTED) {
      throw new BadRequestException('Short content job must be drafted before approve');
    }

    job.approve();
    const saved = await this.shortContentJobRepository.save(job);

    return AdminShortContentJobOutputDto.fromEntity(saved);
  }

  private async getJobOrThrow(jobId: number): Promise<ShortContentJob> {
    const job = await this.shortContentJobRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException('Short content job not found');
    }

    return job;
  }
}

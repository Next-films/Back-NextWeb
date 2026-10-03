import {
  Body,
  Controller,
  Delete,
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
import { AdminCreateShortContentHighlightsInputDto } from '@/admin/api/dtos/input/admin-create-short-content-highlights.input.dto';
import { ShortContentClientService } from '@/admin/application/services/short-content-client.service';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ShortContentJob, ShortContentType } from '@/admin/domain/short-content-job.entity';
import { ShortContentJobRepository } from '@/admin/infrastructure/short-content-job.repository';
import { AdminShortContentJobOutputDto } from '@/admin/api/dtos/output/admin-short-content-job.output.dto';
import { AdminGetShortContentJobsInputQueryDto } from '@/admin/api/dtos/input/admin-get-short-content-jobs.input-query.dto';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';

/**
 * Highlight clips of a film/cartoon/serial episode: the admin starts a cut by
 * content id and later downloads the clips cut by the short-content service.
 */
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

    await Promise.all(jobs.map(job => this.refresh(job)));

    return AdminShortContentJobOutputDto.fromEntities(jobs);
  }

  @Get(':jobId')
  async getById(
    @Param('jobId', ParseIntPatchPipe) jobId: number,
  ): Promise<AdminShortContentJobOutputDto> {
    this.logger.log(`Execute: get short content job by id: ${jobId}`, this.getById.name);
    const job = await this.getJobOrThrow(jobId);

    await this.refresh(job);

    return AdminShortContentJobOutputDto.fromEntity(job);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('highlights')
  async createHighlights(
    @Body() body: AdminCreateShortContentHighlightsInputDto,
  ): Promise<AdminShortContentJobOutputDto> {
    this.logger.log('Execute: start short content highlights', this.createHighlights.name);
    const job = await this.shortContentJobRepository.save(
      ShortContentJob.create(
        body.contentType as ShortContentType,
        body.contentId,
        body as unknown as Record<string, unknown>,
      ),
    );

    try {
      job.markStarted(await this.shortContentClient.createHighlights(body));
    } catch (error) {
      job.markFailed(error instanceof Error ? error.message : String(error));
    }

    return AdminShortContentJobOutputDto.fromEntity(await this.shortContentJobRepository.save(job));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':jobId')
  async remove(@Param('jobId', ParseIntPatchPipe) jobId: number): Promise<void> {
    this.logger.log(`Execute: delete short content job: ${jobId}`, this.remove.name);
    const job = await this.getJobOrThrow(jobId);

    if (job.shortContentJobId) {
      try {
        await this.shortContentClient.deleteHighlights(job.shortContentJobId);
      } catch (error) {
        // The record must still be removable when the service is down: its
        // retention sweep deletes the leftover clips later.
        this.logger.warn(
          `Cannot delete clips of short content job ${job.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          this.remove.name,
        );
      }
    }

    await this.shortContentJobRepository.remove(job);
  }

  /** Pulls the current state (stage, finished clips) of an unfinished job. */
  private async refresh(job: ShortContentJob): Promise<void> {
    if (job.isFinished || !job.shortContentJobId) {
      return;
    }

    try {
      job.syncFromEngine(await this.shortContentClient.getHighlights(job.shortContentJobId));
      await this.shortContentJobRepository.save(job);
    } catch (error) {
      // The service may be restarting: keep the last known state and retry on the next poll.
      this.logger.warn(
        `Cannot refresh short content job ${job.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        this.refresh.name,
      );
    }
  }

  private async getJobOrThrow(jobId: number): Promise<ShortContentJob> {
    const job = await this.shortContentJobRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException('Short content job not found');
    }

    return job;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminCreateShortContentHighlightsInputDto } from '@/admin/api/dtos/input/admin-create-short-content-highlights.input.dto';
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
import { AdminUpdateShortContentClipMusicInputDto } from '@/admin/api/dtos/input/admin-update-short-content-clip-music.input.dto';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { AdminUploadShortContentMusicInputDto } from '@/admin/api/dtos/input/admin-upload-short-content-music.input.dto';
import { fileValidationPipe } from '@/common/pipes/validation-file.pipe';

const MUSIC_MAX_SIZE_MB = 50;
const MUSIC_MIME_TYPES = [
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/vnd.wave',
  'audio/wav',
  'audio/x-aac',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-mpeg',
  'audio/x-wav',
  'application/ogg',
];

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

  @Get('sources/:contentType/:contentId')
  async getSources(
    @Param('contentType') contentType: string,
    @Param('contentId', ParseIntPatchPipe) contentId: number,
  ): Promise<Record<string, unknown>> {
    if (!Object.values(ShortContentType).includes(contentType as ShortContentType)) {
      throw new BadRequestException('contentType must be film, cartoon or serial');
    }

    return this.shortContentClient.getSources(contentType, contentId);
  }

  @Get('music-tracks')
  getMusicTracks(): Promise<Record<string, unknown>[]> {
    return this.shortContentClient.getMusicTracks();
  }

  @Post('music-tracks')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MUSIC_MAX_SIZE_MB * 1024 * 1024 } }),
  )
  uploadMusicTrack(
    @Body() body: AdminUploadShortContentMusicInputDto,
    @UploadedFile(fileValidationPipe(MUSIC_MIME_TYPES, MUSIC_MAX_SIZE_MB))
    file: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    this.logger.log(`Upload short content music: ${body.title}`, this.uploadMusicTrack.name);

    return this.shortContentClient.uploadMusicTrack(file, body);
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

  @Patch(':jobId/clips/:clipIndex/music')
  async updateClipMusic(
    @Param('jobId', ParseIntPatchPipe) jobId: number,
    @Param('clipIndex', ParseIntPatchPipe) clipIndex: number,
    @Body() body: AdminUpdateShortContentClipMusicInputDto,
  ): Promise<AdminShortContentJobOutputDto> {
    const job = await this.getJobOrThrow(jobId);

    if (!job.shortContentJobId) {
      throw new BadRequestException('Short content job has not been started');
    }

    job.syncFromEngine(
      await this.shortContentClient.updateClipMusic(job.shortContentJobId, clipIndex, body),
    );

    return AdminShortContentJobOutputDto.fromEntity(await this.shortContentJobRepository.save(job));
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

  /** Pulls active progress and legacy-music upgrades from the rendering service. */
  private async refresh(job: ShortContentJob): Promise<void> {
    const clips = job.draftPayload?.clips;
    const waitsForLegacyMusic =
      job.status === ShortContentJobStatus.RENDERED &&
      Array.isArray(clips) &&
      clips.some(
        clip =>
          typeof clip === 'object' &&
          clip !== null &&
          (clip as Record<string, unknown>).revision === undefined,
      );

    if (!job.shortContentJobId || (job.isFinished && !waitsForLegacyMusic)) {
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

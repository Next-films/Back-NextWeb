import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { SwaggerDecoratorAdminGetAllSerials } from '@/admin/api/swagger/admin-get-all-serials.swagger.decorator';
import { SwaggerDecoratorAdminCreateSerial } from '@/admin/api/swagger/admin-add-serial.swagger.decorator';
import { SwaggerDecoratorAdminUpdateSerialById } from '@/admin/api/swagger/admin-update-serial-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveSerialById } from '@/admin/api/swagger/admin-remove-serial-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideSerialById } from '@/admin/api/swagger/admin-show-hide-serial-by-id.swagger.decorator';
import { AdminGetAllSerialsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-serials.input-query.dto';
import { AdminCinemaSerialsOutputDto } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
import { AdminUpdateSerialInputDto } from '@/admin/api/dtos/input/admin-update-serial.input.dto';
import { AdminShowOrHiddeSerialInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-serial.input.dto';
import { AdminCheckSerialUpdatesInputDto } from '@/admin/api/dtos/input/admin-check-serial-updates.input.dto';
import { AdminSerialSeasonsPlanOutputDto } from '@/admin/api/dtos/output/admin-serial-seasons.output.dto';
import { AdminGetAllSerialsQuery } from '@/admin/application/query-handlers/admin-get-all-serials.query-handler';
import { AdminUpdateSerialCommand } from '@/admin/application/handlers/admin-update-serial.handler';
import { AdminRemoveSerialCommand } from '@/admin/application/handlers/admin-remove-serial.handler';
import { AdminShowOrHiddeSerialCommand } from '@/admin/application/handlers/admin-show-or-hide-serial.handler';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ApiDeprecated } from '@/common/decorators/api-deprecated.swagger.decorator';
import { AdminGetSerialByIdQuery } from '@/admin/application/query-handlers/admin-get-serial-by-id.query-handler';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { storageUtil } from '@/common/utils/storage-big-files.util';
import { unlink } from 'fs/promises';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';

@ApiTags(
  'Admin cinema - serials. Handles administrative operations for the movie theater content library.',
)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.SERIALS}`)
export class AdminCinemaSerialsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly serialRepository: SerialRepository,
  ) {
    this.logger.setContext(AdminCinemaSerialsController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllSerials()
  async getAllSerials(
    @Query() query: AdminGetAllSerialsInputQueryDto,
  ): Promise<PaginationUtil<AdminCinemaSerialsOutputDto[]> | void> {
    this.logger.log('Execute: get all serials by admin', this.getAllSerials.name);

    const result = await this.queryBus.execute<
      AdminGetAllSerialsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaSerialsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllSerialsQuery(query));

    this.logger.log(result.appResult, this.getAllSerials.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @ApiDeprecated()
  @Post()
  @SwaggerDecoratorAdminCreateSerial()
  addSerial() {
    throw new InternalServerErrorException('Method not implemented');
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`:serialId`)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'videoFile', maxCount: 1 },
        { name: 'previewFile', maxCount: 1 },
        { name: 'titleFile', maxCount: 1 },
        { name: 'backgroundFile', maxCount: 1 },
        { name: 'horizontalPreviewFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  @SwaggerDecoratorAdminUpdateSerialById()
  async updateSerial(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Body() body: AdminUpdateSerialInputDto,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      previewFile?: Express.Multer.File[];
      titleFile?: Express.Multer.File[];
      backgroundFile?: Express.Multer.File[];
      horizontalPreviewFile?: Express.Multer.File[];
    },
  ): Promise<AdminCinemaSerialsOutputDto | void> {
    this.logger.log('Execute: update serial by admin', this.updateSerial.name);
    const videoFile = files?.videoFile?.[0];
    const previewFile = files?.previewFile?.[0];
    const titleFile = files?.titleFile?.[0];
    const backgroundFile = files?.backgroundFile?.[0];
    const horizontalPreviewFile = files?.horizontalPreviewFile?.[0];

    try {
      const result = await this.commandBus.execute<
        AdminUpdateSerialCommand,
        AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
      >(
        new AdminUpdateSerialCommand(serialId, {
          ...body,
          previewFile,
          videoFile,
          titleFile,
          backgroundFile,
          horizontalPreviewFile,
        }),
      );

      this.logger.log(result.appResult, this.updateSerial.name);

      if (result.appResult === AppNotificationResultEnum.Success) {
        const serialResult = await this.queryBus.execute<
          AdminGetSerialByIdQuery,
          AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
        >(new AdminGetSerialByIdQuery(serialId));

        return serialResult.data!;
      }

      this.appNotification.handleHttpResult(result);
    } finally {
      const tempFiles = [videoFile, previewFile, titleFile, backgroundFile, horizontalPreviewFile]
        .filter(file => file?.path)
        .map(file => file!);

      for (const file of tempFiles) {
        try {
          await unlink(file.path);
          this.logger.log(`Temp file removed: ${file.path}`);
        } catch (err) {
          this.logger.error(err, this.updateSerial.name);
        }
      }
    }
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:serialId`)
  @SwaggerDecoratorAdminRemoveSerialById()
  async removeSerial(@Param('serialId', ParseIntPatchPipe) serialId: number): Promise<void> {
    this.logger.log('Execute: remove serial by admin', this.removeSerial.name);

    const result = await this.commandBus.execute<
      AdminRemoveSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveSerialCommand(serialId));

    this.logger.log(result.appResult, this.removeSerial.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:serialId/episodes/:episodeId`)
  async removeSerialEpisode(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Param('episodeId', ParseIntPatchPipe) episodeId: number,
  ): Promise<void> {
    this.logger.log('Execute: remove serial episode by admin', this.removeSerialEpisode.name);

    const serial = await this.serialRepository.getSerialById(serialId);
    if (!serial) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest([{ field: 'serialId', message: 'Serial not found' }]),
      );
      return;
    }

    const episode = await this.serialRepository.getSerialEpisodeById(serialId, episodeId);
    if (!episode) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest([{ field: 'episodeId', message: 'Episode not found' }]),
      );
      return;
    }

    await this.serialRepository.removeSerialEpisode(episode);
    await this.serialRepository.removeSeasonIfEmpty(serialId, episode.seasonId ?? null);
  }

  @HttpCode(HttpStatus.CREATED)
  @Patch(`:serialId`)
  @SwaggerDecoratorAdminShowOrHideSerialById()
  async showOrHideSerial(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Body() body: AdminShowOrHiddeSerialInputDto,
  ): Promise<AdminCinemaSerialsOutputDto | void> {
    this.logger.log('Execute: show or hide serial by admin', this.showOrHideSerial.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeSerialCommand(serialId, body));

    this.logger.log(result.appResult, this.showOrHideSerial.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const serialResult = await this.queryBus.execute<
        AdminGetSerialByIdQuery,
        AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
      >(new AdminGetSerialByIdQuery(serialId));

      return serialResult.data!;
    }

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  /**
   * Enrich the bridge seasons plan with download state per season. A season counts as
   * already downloaded when it is complete, or when completeness is unknown (Kinopoisk gave
   * no episode count) but episodes already exist — re-downloading such seasons is blocked.
   */
  private buildSeasonsWithStats(
    seasons: {
      seasonNumber: number;
      torrentsCount: number;
      expectedEpisodesCount: number | null;
    }[],
    episodes: { seasonNumber?: number | null }[],
  ): AdminSerialSeasonsPlanOutputDto['seasons'] {
    const downloadedEpisodesCountBySeason = new Map<number, number>();

    for (const episode of episodes || []) {
      if (!episode.seasonNumber) continue;
      downloadedEpisodesCountBySeason.set(
        episode.seasonNumber,
        (downloadedEpisodesCountBySeason.get(episode.seasonNumber) || 0) + 1,
      );
    }

    return seasons.map(season => {
      const downloadedEpisodesCount = downloadedEpisodesCountBySeason.get(season.seasonNumber) || 0;
      const missingEpisodesCount =
        season.expectedEpisodesCount !== null
          ? Math.max(0, season.expectedEpisodesCount - downloadedEpisodesCount)
          : null;
      const isComplete =
        season.expectedEpisodesCount !== null
          ? downloadedEpisodesCount >= season.expectedEpisodesCount
          : null;
      const isDownloaded =
        isComplete === true ||
        (season.expectedEpisodesCount === null && downloadedEpisodesCount > 0);

      return {
        ...season,
        downloadedEpisodesCount,
        missingEpisodesCount,
        isComplete,
        isDownloaded,
        canDownload: !isDownloaded && season.torrentsCount > 0,
      };
    });
  }

  @Post(`:serialId/check-updates`)
  async checkSerialUpdates(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Body() body: AdminCheckSerialUpdatesInputDto,
  ): Promise<{ message: string } | void> {
    this.logger.log('Execute: check serial updates by admin', this.checkSerialUpdates.name);

    const serialResult = await this.queryBus.execute<
      AdminGetSerialByIdQuery,
      AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminGetSerialByIdQuery(serialId));

    if (serialResult.appResult !== AppNotificationResultEnum.Success || !serialResult.data?.kpId) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest([
          { field: 'serialId', message: 'Serial not found or kpId is missing' },
        ]),
      );
      return;
    }

    const removedDuplicates = await this.serialRepository.removeDuplicateEpisodesBySerialId(
      serialId,
    );
    if (removedDuplicates > 0) {
      this.logger.warn(
        `Removed duplicate serial episodes before check-updates. serialId=${serialId}, removed=${removedDuplicates}`,
        this.checkSerialUpdates.name,
      );
    }

    const refreshedSerialResult = await this.queryBus.execute<
      AdminGetSerialByIdQuery,
      AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminGetSerialByIdQuery(serialId));
    const kpId =
      refreshedSerialResult.appResult === AppNotificationResultEnum.Success &&
      refreshedSerialResult.data?.kpId
        ? refreshedSerialResult.data.kpId
        : serialResult.data.kpId;

    // Block re-downloading seasons that already exist: drop already-downloaded ones from the
    // request, and refuse outright if every requested season is already present.
    let seasonNumbers = body.seasonNumbers;

    if (seasonNumbers?.length && refreshedSerialResult.data) {
      const seasonsResult = await this.downloaderServiceAdapter.bridgeGetSerialSeasonsByKpId(kpId);

      if (seasonsResult.appResult === AppNotificationResultEnum.Success && seasonsResult.data) {
        const downloadedSeasonNumbers = new Set(
          this.buildSeasonsWithStats(
            seasonsResult.data.seasons,
            refreshedSerialResult.data.episodes || [],
          )
            .filter(season => season.isDownloaded)
            .map(season => season.seasonNumber),
        );
        const allowedSeasons = seasonNumbers.filter(season => !downloadedSeasonNumbers.has(season));
        const blockedSeasons = seasonNumbers.filter(season => downloadedSeasonNumbers.has(season));

        if (allowedSeasons.length === 0) {
          return {
            message: `Сезоны уже скачаны: ${blockedSeasons
              .sort((a, b) => a - b)
              .join(', ')}. Повторная загрузка не требуется.`,
          };
        }

        if (blockedSeasons.length > 0) {
          this.logger.log(
            `Skipping already-downloaded seasons for serialId=${serialId}: ${blockedSeasons.join(
              ', ',
            )}`,
            this.checkSerialUpdates.name,
          );
        }

        seasonNumbers = allowedSeasons;
      }
    }

    const reconcileResult = await this.downloaderServiceAdapter.bridgeReconcileSerialByKpId(
      kpId,
      seasonNumbers,
    );

    if (reconcileResult.appResult !== AppNotificationResultEnum.Success || !reconcileResult.data) {
      this.appNotification.handleHttpResult(reconcileResult);
      return;
    }

    return reconcileResult.data;
  }

  @Get(`:serialId/check-updates/seasons`)
  async getSerialCheckUpdatesSeasons(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
  ): Promise<AdminSerialSeasonsPlanOutputDto | void> {
    this.logger.log(
      'Execute: get serial seasons for check updates by admin',
      this.getSerialCheckUpdatesSeasons.name,
    );

    const serialResult = await this.queryBus.execute<
      AdminGetSerialByIdQuery,
      AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminGetSerialByIdQuery(serialId));

    if (serialResult.appResult !== AppNotificationResultEnum.Success || !serialResult.data?.kpId) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest([
          { field: 'serialId', message: 'Serial not found or kpId is missing' },
        ]),
      );
      return;
    }

    const removedDuplicates = await this.serialRepository.removeDuplicateEpisodesBySerialId(
      serialId,
    );
    if (removedDuplicates > 0) {
      this.logger.warn(
        `Removed duplicate serial episodes before seasons plan. serialId=${serialId}, removed=${removedDuplicates}`,
        this.getSerialCheckUpdatesSeasons.name,
      );
    }

    const refreshedSerialResult = await this.queryBus.execute<
      AdminGetSerialByIdQuery,
      AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminGetSerialByIdQuery(serialId));

    if (
      refreshedSerialResult.appResult !== AppNotificationResultEnum.Success ||
      !refreshedSerialResult.data?.kpId
    ) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest([
          { field: 'serialId', message: 'Serial not found or kpId is missing' },
        ]),
      );
      return;
    }

    const seasonsResult = await this.downloaderServiceAdapter.bridgeGetSerialSeasonsByKpId(
      refreshedSerialResult.data.kpId,
    );

    if (seasonsResult.appResult !== AppNotificationResultEnum.Success || !seasonsResult.data) {
      this.appNotification.handleHttpResult(seasonsResult);
      return;
    }

    const seasonsWithStats = this.buildSeasonsWithStats(
      seasonsResult.data.seasons,
      refreshedSerialResult.data.episodes || [],
    );

    const downloadedSeasons = seasonsWithStats
      .filter(season => season.isDownloaded)
      .map(season => season.seasonNumber)
      .sort((a, b) => a - b);

    return {
      ...seasonsResult.data,
      downloadedSeasons,
      seasons: seasonsWithStats,
    };
  }
}

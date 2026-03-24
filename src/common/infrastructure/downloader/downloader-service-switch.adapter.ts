import { Injectable } from '@nestjs/common';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { DownloaderServiceRestAdapter } from '@/common/infrastructure/rest/downloader-service.rest.adapter';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE,
  DownloaderRunByListInputDto,
  DownloaderTriggerScheduleDto,
  DownloaderTriggerTaskRuntimeStatusDto,
  ImgExtEnum,
  MovieTypesEnum,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';

type FallbackResult<T> = AppNotificationResult<T, ErrorFieldExceptionDto | null>;

@Injectable()
export class DownloaderServiceSwitchAdapter {
  constructor(
    private readonly rmqAdapter: DownloaderServiceAdapter | null,
    private readonly restAdapter: DownloaderServiceRestAdapter,
    private readonly modeService: DownloaderTransportModeService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(DownloaderServiceSwitchAdapter.name);
  }

  // ─── Core helpers ───────────────────────────────────────────────

  private requireRmq(): DownloaderServiceAdapter {
    if (!this.rmqAdapter) throw new Error('RMQ adapter is unavailable.');
    return this.rmqAdapter;
  }

  private rmqCall<T>(fn: (adapter: DownloaderServiceAdapter) => T): () => T {
    return () => fn(this.requireRmq());
  }

  /**
   * RMQ-first, HTTP-fallback (fire-and-forget / void actions).
   */
  private async executeBridgeWithFallback(
    actionName: string,
    rmqAction: () => Promise<void>,
    httpAction: () => Promise<void>,
  ): Promise<void> {
    if (!this.modeService.isRmqMode()) {
      await httpAction();
      return;
    }

    try {
      await rmqAction();
      this.modeService.markRmqSuccess();
    } catch (error) {
      this.logger.warn(
        `RMQ bridge action failed (${actionName}). Auto fallback to HTTP transport.`,
        this.executeBridgeWithFallback.name,
      );
      this.logger.error(error, this.executeBridgeWithFallback.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      await httpAction();
    }
  }

  /**
   * RMQ-first, HTTP-fallback (request/response actions).
   */
  private async executeRequestWithFallback<T>(
    actionName: string,
    rmqAction: () => Promise<FallbackResult<T>>,
    httpAction: () => Promise<FallbackResult<T>>,
  ): Promise<FallbackResult<T>> {
    if (!this.modeService.isRmqMode()) {
      return httpAction();
    }

    try {
      const rmqResult = await rmqAction();

      if (rmqResult.appResult === AppNotificationResultEnum.InternalError) {
        this.logger.warn(
          `RMQ request action returned InternalError (${actionName}). Auto fallback to HTTP transport.`,
          this.executeRequestWithFallback.name,
        );
        this.modeService.markRmqFailureAndFallbackToHttp();
        return httpAction();
      }

      this.modeService.markRmqSuccess();
      return rmqResult;
    } catch (error) {
      this.logger.warn(
        `RMQ request action failed (${actionName}). Auto fallback to HTTP transport.`,
        this.executeRequestWithFallback.name,
      );
      this.logger.error(error, this.executeRequestWithFallback.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      return httpAction();
    }
  }

  /**
   * REST-first, RMQ-fallback (for read-only / status operations).
   */
  private async restFirstWithFallback<T>(
    actionName: string,
    restAction: () => Promise<T>,
    rmqFallback: ((adapter: DownloaderServiceAdapter) => Promise<T>) | null,
    defaultValue?: T,
  ): Promise<T> {
    try {
      return await restAction();
    } catch (error) {
      this.logger.error(error, actionName);

      if (rmqFallback && this.modeService.isRmqMode() && this.rmqAdapter) {
        return rmqFallback(this.rmqAdapter);
      }

      if (arguments.length >= 4) return defaultValue as T;
      throw error;
    }
  }

  // ─── REST-only (no fallback needed) ─────────────────────────────

  bridgeRunByList(payload: DownloaderRunByListInputDto): Promise<void> {
    return this.restAdapter.bridgeRunByList(payload);
  }

  cancelBridgeProcess(): Promise<FallbackResult<{ message: string }>> {
    return this.restAdapter.cancelBridgeProcess();
  }

  // ─── Bridge void actions (RMQ → HTTP fallback) ─────────────────

  bridgeFindFilms(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindFilms.name,
      this.rmqCall(a => a.bridgeFindFilms()),
      () => this.restAdapter.bridgeFindFilms(),
    );
  }

  bridgeDownloadFilms(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadFilms.name,
      this.rmqCall(a => a.bridgeDownloadFilms()),
      () => this.restAdapter.bridgeDownloadFilms(),
    );
  }

  bridgeFindCartoons(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindCartoons.name,
      this.rmqCall(a => a.bridgeFindCartoons()),
      () => this.restAdapter.bridgeFindCartoons(),
    );
  }

  bridgeDownloadCartoons(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadCartoons.name,
      this.rmqCall(a => a.bridgeDownloadCartoons()),
      () => this.restAdapter.bridgeDownloadCartoons(),
    );
  }

  bridgeFindSerials(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeFindSerials.name,
      this.rmqCall(a => a.bridgeFindSerials()),
      () => this.restAdapter.bridgeFindSerials(),
    );
  }

  bridgeDownloadSerials(): Promise<void> {
    return this.executeBridgeWithFallback(
      this.bridgeDownloadSerials.name,
      this.rmqCall(a => a.bridgeDownloadSerials()),
      () => this.restAdapter.bridgeDownloadSerials(),
    );
  }

  // ─── Request/response actions (RMQ → HTTP fallback) ────────────

  bridgeReconcileSerialByKpId(kpId: string): Promise<FallbackResult<{ message: string }>> {
    return this.executeRequestWithFallback(
      this.bridgeReconcileSerialByKpId.name,
      this.rmqCall(a => a.bridgeReconcileSerialByKpId(kpId)),
      () => this.restAdapter.bridgeReconcileSerialByKpId(kpId),
    );
  }

  clearLogs(keys: string[]): Promise<FallbackResult<null>> {
    return this.executeRequestWithFallback(
      this.clearLogs.name,
      this.rmqCall(a => a.clearLogs(keys)),
      () => this.restAdapter.clearLogs(keys),
    );
  }

  removeMovie(key: string): Promise<FallbackResult<null>> {
    return this.executeRequestWithFallback(
      this.removeMovie.name,
      this.rmqCall(a => a.removeMovie(key)),
      () => this.restAdapter.removeMovie(key),
    );
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<FallbackResult<null>> {
    return this.executeRequestWithFallback(
      this.addMovieToQueue.name,
      this.rmqCall(a => a.addMovieToQueue(torrent, provider, type)),
      () => this.restAdapter.addMovieToQueue(torrent, provider, type),
    );
  }

  downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<FallbackResult<string | null>> {
    // Binary files must go through REST (multipart/form-data) —
    // RMQ JSON serialization corrupts binary Buffer data.
    if (typeof file !== 'string') {
      return this.restAdapter.downloadPreviewClip(movieId, file, type);
    }

    return this.executeRequestWithFallback(
      this.downloadPreviewClip.name,
      this.rmqCall(a => a.downloadPreviewClip(movieId, file, type)),
      () => this.restAdapter.downloadPreviewClip(movieId, file, type),
    );
  }

  uploadFilm(
    movieId: number,
    file: Express.Multer.File,
    type: MovieTypesEnum,
  ): FallbackResult<null> {
    if (!this.modeService.isRmqMode()) {
      return this.restAdapter.uploadFilm(movieId, file, type);
    }

    try {
      const rmqResult = this.requireRmq().uploadFilm(movieId, file, type);

      if (rmqResult.appResult === AppNotificationResultEnum.InternalError) {
        this.logger.warn(
          `RMQ request action returned InternalError (${this.uploadFilm.name}). Auto fallback to HTTP transport.`,
          this.uploadFilm.name,
        );
        this.modeService.markRmqFailureAndFallbackToHttp();
        return this.restAdapter.uploadFilm(movieId, file, type);
      }

      this.modeService.markRmqSuccess();
      return rmqResult;
    } catch (error) {
      this.logger.warn(
        `RMQ request action failed (${this.uploadFilm.name}). Auto fallback to HTTP transport.`,
        this.uploadFilm.name,
      );
      this.logger.error(error, this.uploadFilm.name);
      this.modeService.markRmqFailureAndFallbackToHttp();
      return this.restAdapter.uploadFilm(movieId, file, type);
    }
  }

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<FallbackResult<string>> {
    return this.executeRequestWithFallback(
      this.resizeAndSavePoster.name,
      this.rmqCall(a => a.resizeAndSavePoster(movieId, file, type)),
      () => this.restAdapter.resizeAndSavePoster(movieId, file, type),
    );
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<FallbackResult<string>> {
    return this.executeRequestWithFallback(
      this.resizeAndSaveLogo.name,
      this.rmqCall(a => a.resizeAndSaveLogo(movieId, file, type)),
      () => this.restAdapter.resizeAndSaveLogo(movieId, file, type),
    );
  }

  adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<FallbackResult<string>> {
    return this.executeRequestWithFallback(
      this.adminUploadAvatar.name,
      this.rmqCall(a => a.adminUploadAvatar(file, extension, adminId, currentAvatarPath)),
      () => this.restAdapter.adminUploadAvatar(file, extension, adminId, currentAvatarPath),
    );
  }

  // ─── REST-first with RMQ fallback (status/config operations) ───

  getBridgeSchedule(): Promise<DownloaderTriggerScheduleDto> {
    return this.restFirstWithFallback(
      this.getBridgeSchedule.name,
      () => this.restAdapter.getBridgeSchedule(),
      a => a.getBridgeSchedule(),
      DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE,
    );
  }

  updateBridgeSchedule(
    schedule: Partial<DownloaderTriggerScheduleDto>,
  ): Promise<DownloaderTriggerScheduleDto> {
    return this.restFirstWithFallback(
      this.updateBridgeSchedule.name,
      () => this.restAdapter.updateBridgeSchedule(schedule),
      a => a.updateBridgeSchedule(schedule),
    );
  }

  signMediaUrl(url: string | null, expiresInSec: number = 900): Promise<string | null> {
    return this.restFirstWithFallback(
      this.signMediaUrl.name,
      () => this.restAdapter.signMediaUrl(url, expiresInSec),
      a => a.signMediaUrl(url, expiresInSec),
      url,
    );
  }

  getBridgeStatus(): Promise<DownloaderTriggerTaskRuntimeStatusDto> {
    const defaultStatus = Object.fromEntries(
      Object.keys(DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE).map(key => [
        key,
        {
          status: 'idle',
          source: null,
          message: null,
          startedAt: null,
          finishedAt: null,
          updatedAt: null,
          executionId: null,
          stage: null,
          stageProgress: null,
          overallProgress: null,
          details: null,
        },
      ]),
    ) as DownloaderTriggerTaskRuntimeStatusDto;

    return this.restFirstWithFallback(
      this.getBridgeStatus.name,
      () => this.restAdapter.getBridgeStatus(),
      a => a.getBridgeStatus(),
      defaultStatus,
    );
  }
}

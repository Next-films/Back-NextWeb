import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ADD_MOVIE_TO_DOWNLOAD_QUEUE_CMD,
  ADMIN_UPLOAD_AVATAR_CMD,
  BRIDGE_DOWNLOAD_CARTOONS_CMD,
  BRIDGE_DOWNLOAD_FILMS_CMD,
  BRIDGE_DOWNLOAD_SERIALS_CMD,
  BRIDGE_FIND_CARTOONS_CMD,
  BRIDGE_FIND_FILMS_CMD,
  BRIDGE_FIND_SERIALS_CMD,
  CLEAR_LOGS_CMD,
  DOWNLOAD_SERVICE_RMQ_NAME,
  DOWNLOAD_YT_CLIP_CMD,
  REMOVE_MOVIE_CMD,
  RESIZE_SAVE_LOGO_CMD,
  RESIZE_SAVE_POSTER_CMD,
  UPLOAD_FILM_CMD,
} from '@/common/constants/rmq.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { RmqAuthPayload } from '@/common/infrastructure/rmq/types';
import { ClearConverterLogsPayloadDto } from '@/converter-logs/domain/types';
import { AddMovieToDownloadQueuePayloadDto, RemoveMoviePayloadDto } from '@/admin/domain/types';
import {
  AdminUploadAvatarPayloadDto,
  DownloadPreviewYtClipPayloadDto,
  DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE,
  DownloaderRunByListInputDto,
  DownloaderSerialSeasonsOutputDto,
  DownloaderTriggerScheduleDto,
  DownloaderTriggerTaskRuntimeStatusDto,
  IDownloaderServiceAdapter,
  ImgExtEnum,
  MovieTypesEnum,
  ResizeAndSafeLogoPayloadDto,
  ResizeAndSafePosterPayloadDto,
  TorApiMovieById,
  TorApiProvidersEnum,
  UploadFilmPayloadDto,
} from '@/common/types/types';

type Res<T> = AppNotificationResult<T, ErrorFieldExceptionDto | null>;

// ─── Shared utilities ─────────────────────────────────────────────

function buildFileOrUrlFields(file: string | Express.Multer.File): {
  url?: string;
  file?: Express.Multer.File;
} {
  return typeof file === 'string' ? { url: file } : { file };
}

function buildIdleStatus(
  schedule: DownloaderTriggerScheduleDto,
): DownloaderTriggerTaskRuntimeStatusDto {
  return Object.fromEntries(
    Object.keys(schedule).map(key => [
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
}

// ─── Real RMQ adapter ─────────────────────────────────────────────

@Injectable()
export class DownloaderServiceAdapter implements IDownloaderServiceAdapter {
  private readonly auth_token: string;

  constructor(
    private logger: LoggerService,
    private appNotification: ApplicationNotification,
    @Inject(DOWNLOAD_SERVICE_RMQ_NAME) private readonly client: ClientProxy,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(DownloaderServiceAdapter.name);
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    this.auth_token = apiSettings.DOWNLOAD_SERVICE_TOKEN;
  }

  // ─── Core helpers ───────────────────────────────────────────────

  private wrap<T>(payload: T): RmqAuthPayload<T> {
    return { payload, token: this.auth_token };
  }

  /**
   * Send an RMQ command and await the response with a timeout.
   * On error — logs and returns internalServerError.
   */
  private async sendCommand<TPayload, TResult>(
    cmd: string,
    payload: TPayload,
    scope: string,
    timeoutMs: number,
  ): Promise<Res<TResult>> {
    try {
      const response = this.client.send({ cmd }, this.wrap(payload)).pipe(timeout(timeoutMs));

      return await firstValueFrom(response);
    } catch (error) {
      this.logger.error(error, scope);
      return this.appNotification.internalServerError();
    }
  }

  /**
   * Send a bridge command (void result, shorter timeout, re-throws on error).
   */
  private async bridgeSend(cmd: string, scope: string): Promise<void> {
    try {
      await firstValueFrom(
        this.client.send({ cmd }, this.wrap(null)).pipe(timeout(20_000), defaultIfEmpty(null)),
      );
    } catch (error) {
      this.logger.error(error, scope);
      throw error;
    }
  }

  // ─── HTTP-only methods (throw if called via RMQ) ────────────────

  bridgeRunByList(_payload: DownloaderRunByListInputDto): Promise<void> {
    void _payload;
    throw new Error('Run-by-list is available only via HTTP transport adapter.');
  }

  cancelBridgeProcess(): Promise<Res<{ message: string }>> {
    throw new Error('Cancel process is available only via HTTP transport adapter.');
  }

  bridgeReconcileSerialByKpId(
    _kpId: string,
    _seasonNumbers?: number[],
  ): Promise<Res<{ message: string }>> {
    void _kpId;
    void _seasonNumbers;
    throw new Error('Serial reconcile by kpId is available only via HTTP transport adapter.');
  }

  bridgeGetSerialSeasonsByKpId(_kpId: string): Promise<Res<DownloaderSerialSeasonsOutputDto>> {
    void _kpId;
    throw new Error('Get serial seasons by kpId is available only via HTTP transport adapter.');
  }

  bridgeRemoveFromQueueByKpId(
    _type: MovieTypesEnum,
    _kpId: string,
  ): Promise<Res<{ removed: number }>> {
    void _type;
    void _kpId;
    throw new Error('Remove from queue by kpId is available only via HTTP transport adapter.');
  }

  // ─── Bridge void actions ────────────────────────────────────────

  bridgeFindFilms(): Promise<void> {
    return this.bridgeSend(BRIDGE_FIND_FILMS_CMD, this.bridgeFindFilms.name);
  }

  bridgeDownloadFilms(): Promise<void> {
    return this.bridgeSend(BRIDGE_DOWNLOAD_FILMS_CMD, this.bridgeDownloadFilms.name);
  }

  bridgeFindCartoons(): Promise<void> {
    return this.bridgeSend(BRIDGE_FIND_CARTOONS_CMD, this.bridgeFindCartoons.name);
  }

  bridgeDownloadCartoons(): Promise<void> {
    return this.bridgeSend(BRIDGE_DOWNLOAD_CARTOONS_CMD, this.bridgeDownloadCartoons.name);
  }

  bridgeFindSerials(): Promise<void> {
    return this.bridgeSend(BRIDGE_FIND_SERIALS_CMD, this.bridgeFindSerials.name);
  }

  bridgeDownloadSerials(): Promise<void> {
    return this.bridgeSend(BRIDGE_DOWNLOAD_SERIALS_CMD, this.bridgeDownloadSerials.name);
  }

  // ─── Bridge schedule & status (fallback-only via RMQ) ──────────

  getBridgeSchedule(): Promise<DownloaderTriggerScheduleDto> {
    this.logger.warn(
      'Bridge schedule is available only via HTTP transport adapter.',
      this.getBridgeSchedule.name,
    );
    return Promise.resolve(DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE);
  }

  async updateBridgeSchedule(
    schedule: Partial<DownloaderTriggerScheduleDto>,
  ): Promise<DownloaderTriggerScheduleDto> {
    this.logger.warn(
      `Bridge schedule update is available only via HTTP transport adapter. Payload: ${JSON.stringify(
        schedule,
      )}`,
      this.updateBridgeSchedule.name,
    );
    return this.getBridgeSchedule();
  }

  getBridgeStatus(): Promise<DownloaderTriggerTaskRuntimeStatusDto> {
    return this.getBridgeSchedule().then(schedule => buildIdleStatus(schedule));
  }

  // ─── Request/response commands ──────────────────────────────────

  clearLogs(keys: string[]): Promise<Res<null>> {
    const payload: ClearConverterLogsPayloadDto = { keys };
    return this.sendCommand(CLEAR_LOGS_CMD, payload, this.clearLogs.name, 50_000);
  }

  removeMovie(key: string): Promise<Res<null>> {
    const payload: RemoveMoviePayloadDto = { key };
    return this.sendCommand(REMOVE_MOVIE_CMD, payload, this.removeMovie.name, 50_000);
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<Res<null>> {
    const payload: AddMovieToDownloadQueuePayloadDto = { torrent, provider, type };
    return this.sendCommand(
      ADD_MOVIE_TO_DOWNLOAD_QUEUE_CMD,
      payload,
      this.addMovieToQueue.name,
      20_000,
    );
  }

  signMediaUrl(url: string | null, expiresInSec?: number): Promise<string | null> {
    void expiresInSec;
    return Promise.resolve(url);
  }

  downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
    s3KeyPrefix?: string,
  ): Promise<Res<string | null>> {
    const payload: DownloadPreviewYtClipPayloadDto = {
      movieId,
      type,
      s3KeyPrefix,
      ...buildFileOrUrlFields(file),
    };
    return this.sendCommand(DOWNLOAD_YT_CLIP_CMD, payload, this.downloadPreviewClip.name, 180_000);
  }

  uploadFilm(movieId: number, file: Express.Multer.File, type: MovieTypesEnum): Res<null> {
    try {
      const payload: UploadFilmPayloadDto = { movieId, type, file };
      this.client.emit({ cmd: UPLOAD_FILM_CMD }, this.wrap(payload));
      return this.appNotification.success(null);
    } catch (error) {
      this.logger.error(error, this.uploadFilm.name);
      return this.appNotification.internalServerError();
    }
  }

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    const payload: ResizeAndSafePosterPayloadDto = {
      movieId,
      type,
      ...buildFileOrUrlFields(file),
    };
    return this.sendCommand(RESIZE_SAVE_POSTER_CMD, payload, this.resizeAndSavePoster.name, 60_000);
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    const payload: ResizeAndSafeLogoPayloadDto = {
      movieId,
      type,
      ...buildFileOrUrlFields(file),
    };
    return this.sendCommand(RESIZE_SAVE_LOGO_CMD, payload, this.resizeAndSaveLogo.name, 60_000);
  }

  adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<Res<string>> {
    const payload: AdminUploadAvatarPayloadDto = { file, extension, adminId, currentAvatarPath };
    return this.sendCommand(ADMIN_UPLOAD_AVATAR_CMD, payload, this.adminUploadAvatar.name, 60_000);
  }
}

// ─── Mock adapter ─────────────────────────────────────────────────

@Injectable()
export class DownloaderServiceAdapterMock implements IDownloaderServiceAdapter {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(DownloaderServiceAdapterMock.name);
  }

  private mockLog(message: string, scope: string): void {
    this.logger.log(message, scope);
  }

  private mockSuccess<T>(data: T): Res<T> {
    return this.appNotification.success(data);
  }

  // ─── Bridge void actions ────────────────────────────────────────

  bridgeRunByList(payload: DownloaderRunByListInputDto): void {
    this.mockLog(
      `Execute: run by lists (mock). Payload: ${JSON.stringify(payload)}`,
      this.bridgeRunByList.name,
    );
  }

  cancelBridgeProcess(): Promise<Res<{ message: string }>> {
    this.mockLog('Execute: cancel process (mock)', this.cancelBridgeProcess.name);
    return Promise.resolve(this.mockSuccess({ message: 'Mock cancel request accepted' }));
  }

  bridgeFindFilms(): void {
    this.mockLog('Execute: start find films process. (mock)', this.bridgeFindFilms.name);
  }

  bridgeDownloadFilms(): void {
    this.mockLog('Execute: start download films process. (mock)', this.bridgeDownloadFilms.name);
  }

  bridgeFindCartoons(): void {
    this.mockLog('Execute: start find cartoons process. (mock)', this.bridgeFindCartoons.name);
  }

  bridgeDownloadCartoons(): void {
    this.mockLog(
      'Execute: start download cartoons process. (mock)',
      this.bridgeDownloadCartoons.name,
    );
  }

  bridgeFindSerials(): void {
    this.mockLog('Execute: start find serials process. (mock)', this.bridgeFindSerials.name);
  }

  bridgeDownloadSerials(): void {
    this.mockLog(
      'Execute: start download serials process. (mock)',
      this.bridgeDownloadSerials.name,
    );
  }

  bridgeReconcileSerialByKpId(
    kpId: string,
    seasonNumbers?: number[],
  ): Promise<Res<{ message: string }>> {
    this.mockLog(
      `Execute: serial reconcile by kpId (mock). kpId: ${kpId}, seasons: ${JSON.stringify(
        seasonNumbers || [],
      )}`,
      this.bridgeReconcileSerialByKpId.name,
    );
    return Promise.resolve(
      this.mockSuccess({ message: `Mock serial reconcile started for kpId ${kpId}` }),
    );
  }

  bridgeGetSerialSeasonsByKpId(kpId: string): Promise<Res<DownloaderSerialSeasonsOutputDto>> {
    this.mockLog(
      `Execute: get serial seasons by kpId (mock). kpId: ${kpId}`,
      this.bridgeGetSerialSeasonsByKpId.name,
    );
    return Promise.resolve(
      this.mockSuccess({
        kpId,
        title: `Mock serial ${kpId}`,
        totalCandidates: 0,
        totalSeasons: 0,
        seasons: [],
        hasUnknownSeasonCandidates: false,
      }),
    );
  }

  bridgeRemoveFromQueueByKpId(
    type: MovieTypesEnum,
    kpId: string,
  ): Promise<Res<{ removed: number }>> {
    this.mockLog(
      `Execute: remove from queue by kpId (mock). type=${type}, kpId=${kpId}`,
      this.bridgeRemoveFromQueueByKpId.name,
    );
    return Promise.resolve(this.mockSuccess({ removed: 0 }));
  }

  // ─── Bridge schedule & status ───────────────────────────────────

  getBridgeSchedule(): DownloaderTriggerScheduleDto {
    this.mockLog('Execute: get bridge schedule (mock)', this.getBridgeSchedule.name);
    return DEFAULT_DOWNLOADER_TRIGGER_SCHEDULE;
  }

  updateBridgeSchedule(
    schedule: Partial<DownloaderTriggerScheduleDto>,
  ): DownloaderTriggerScheduleDto {
    this.mockLog(
      `Execute: update bridge schedule (mock): ${JSON.stringify(schedule)}`,
      this.updateBridgeSchedule.name,
    );
    return { ...this.getBridgeSchedule(), ...schedule };
  }

  getBridgeStatus(): DownloaderTriggerTaskRuntimeStatusDto {
    return buildIdleStatus(this.getBridgeSchedule());
  }

  // ─── Request/response commands ──────────────────────────────────

  clearLogs(keys: string[]): Promise<Res<null>> {
    this.mockLog(
      `Execute: clear converter logs (mock). Keys: ${JSON.stringify(keys)}`,
      this.clearLogs.name,
    );
    return Promise.resolve(this.mockSuccess(null));
  }

  removeMovie(key: string): Promise<Res<null>> {
    this.mockLog(`Execute: remove movie (mock). Key: ${key}`, this.removeMovie.name);
    return Promise.resolve(this.mockSuccess(null));
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<Res<null>> {
    this.mockLog(
      `Execute: add movie to queue (mock). Provider: ${provider}, type: ${type}, torrent: ${JSON.stringify(
        torrent,
      )}`,
      this.addMovieToQueue.name,
    );
    return Promise.resolve(this.mockSuccess(null));
  }

  signMediaUrl(url: string | null, expiresInSec?: number): Promise<string | null> {
    void expiresInSec;
    this.mockLog(`Execute: sign media url (mock). Url: ${url ?? 'null'}`, this.signMediaUrl.name);
    return Promise.resolve(url);
  }

  downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
    s3KeyPrefix?: string,
  ): Promise<Res<string | null>> {
    const fileData = typeof file === 'string' ? `url: ${file}` : `file: ${file.originalname}`;
    this.mockLog(
      `Execute: download yt clip (mock). Movie id: ${movieId}, type: ${type}, s3KeyPrefix: ${
        s3KeyPrefix ?? 'preview-clip'
      }, ${fileData}`,
      this.downloadPreviewClip.name,
    );
    return Promise.resolve(this.mockSuccess('mock'));
  }

  uploadFilm(movieId: number, file: Express.Multer.File, type: MovieTypesEnum): Res<null> {
    void file;
    this.mockLog(
      `Execute: upload film (mock). Movie id: ${movieId}, type: ${type}`,
      this.uploadFilm.name,
    );
    return this.mockSuccess(null);
  }

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    const fileData = typeof file === 'string' ? `url: ${file}` : `file: ${file.originalname}`;
    this.mockLog(
      `Execute: resize and save poster (mock). Movie id: ${movieId}, type: ${type}, ${fileData}`,
      this.resizeAndSavePoster.name,
    );
    return Promise.resolve(this.mockSuccess('mock'));
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    const fileData = typeof file === 'string' ? `url: ${file}` : `file: ${file.originalname}`;
    this.mockLog(
      `Execute: resize and save logo (mock). Movie id: ${movieId}, type: ${type}, ${fileData}`,
      this.resizeAndSaveLogo.name,
    );
    return Promise.resolve(this.mockSuccess('mock'));
  }

  adminUploadAvatar(
    _file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<Res<string>> {
    void _file;
    this.mockLog(
      `Execute: upload avatar (mock). Ext: ${extension}, admin id: ${adminId}, current avatar: ${currentAvatarPath}`,
      this.adminUploadAvatar.name,
    );
    return Promise.resolve(
      this.mockSuccess(
        'https://www.shutterstock.com/image-vector/young-smiling-man-avatar-3d-600nw-2124054758.jpg',
      ),
    );
  }
}

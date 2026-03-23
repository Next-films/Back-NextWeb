import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ClearConverterLogsPayloadDto } from '@/converter-logs/domain/types';
import { AddMovieToDownloadQueuePayloadDto, RemoveMoviePayloadDto } from '@/admin/domain/types';
import {
  DownloadPreviewYtClipPayloadDto,
  DownloaderRunByListInputDto,
  DownloaderTriggerScheduleDto,
  DownloaderTriggerTaskRuntimeStatusDto,
  IDownloaderServiceAdapter,
  ImgExtEnum,
  MovieTypesEnum,
  ResizeAndSafeLogoPayloadDto,
  TorApiMovieById,
  TorApiProvidersEnum,
} from '@/common/types/types';
import { HttpService } from '@nestjs/axios';
import {
  DOWNLOADER_HTTP_SERVICE,
  DOWNLOADER_SERVICE_REST_BRIDGE_METHODS_CONSTANTS as BRIDGE,
  DOWNLOADER_SERVICE_REST_CONVERTER_METHODS_CONSTANTS as CONVERTER,
  DOWNLOADER_SERVICE_REST_DOWNLOADER_METHODS_CONSTANTS as DOWNLOADER,
  DOWNLOADER_SERVICE_REST_MOVIES_METHODS_CONSTANTS as MOVIES,
  DOWNLOADER_SERVICE_REST_USERS_ADMIN_METHODS_CONSTANTS as USERS_ADMIN,
} from '@/common/constants/downloader-service.rest.constants';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import * as path from 'path';
import { createReadStream } from 'fs';

type Res<T> = AppNotificationResult<T, ErrorFieldExceptionDto | null>;

@Injectable()
export class DownloaderServiceRestAdapter implements IDownloaderServiceAdapter {
  private readonly baseAuthHeaders: AxiosRequestConfig;

  constructor(
    private logger: LoggerService,
    private appNotification: ApplicationNotification,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(DOWNLOADER_HTTP_SERVICE) private readonly httpService: HttpService,
  ) {
    this.logger.setContext(DownloaderServiceRestAdapter.name);
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.baseAuthHeaders = {
      headers: {
        Authorization: `Bearer ${apiSettings.DOWNLOAD_SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
  }

  // ─── Core helpers ───────────────────────────────────────────────

  private url(...segments: string[]): string {
    return segments.join('/');
  }

  private stringifyUnknown(input: unknown): string {
    if (typeof input === 'string') return input;
    if (input == null) return 'null';

    try {
      return JSON.stringify(input);
    } catch {
      return '[unserializable]';
    }
  }

  private buildTransportErrorMessage(error: any): string {
    const status = error?.response?.status ?? 'unknown';
    const method =
      typeof error?.config?.method === 'string' ? error.config.method.toUpperCase() : '';
    const url = error?.config?.url ?? 'unknown-url';
    const responseBody = this.stringifyUnknown(error?.response?.data);
    const axiosMessage = error?.message ? `; message=${error.message}` : '';

    return `HTTP bridge failed: status=${status}; method=${method}; url=${url}; response=${responseBody}${axiosMessage}`;
  }

  private handleError<T = null, D = null>(error: any, scope?: string): AppNotificationResult<T, D> {
    const data: AppNotificationResult<T, D> = error?.response?.data;

    if (error?.response?.data?.appResult) {
      return data;
    }

    const message = this.buildTransportErrorMessage(error);
    this.logger.error(message, scope ?? this.handleError.name);

    return {
      appResult: AppNotificationResultEnum.InternalError,
      data: null,
      errorField: {
        field: 'downloaderService',
        message,
        errorKey: EXCEPTION_KEYS_ENUM.UNKNOWN,
      } as D,
    };
  }

  /**
   * POST that returns void — logs and re-throws on error.
   */
  private async postVoid(url: string, payload: unknown, scope: string): Promise<void> {
    try {
      await this.httpService.axiosRef.post(url, payload, this.baseAuthHeaders);
    } catch (e) {
      this.logger.error(e, scope);
      throw e;
    }
  }

  /**
   * POST that returns AppNotificationResult — falls back to handleError on failure.
   */
  private async postResult<T>(url: string, payload: unknown, scope: string): Promise<Res<T>> {
    try {
      const result = await this.httpService.axiosRef.post<Res<T>>(
        url,
        payload,
        this.baseAuthHeaders,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, scope);
    }
  }

  /**
   * Build a FormData with a file buffer/stream + arbitrary string fields.
   */
  private buildForm(
    file: Express.Multer.File,
    filename: string,
    fields: Record<string, string>,
  ): FormData {
    const form = new FormData();
    const contentType = file.mimetype || undefined;

    if (file.buffer) {
      form.append('file', file.buffer, { filename, contentType });
    } else if (file.path) {
      form.append('file', createReadStream(file.path), { filename, contentType });
    } else {
      throw new Error('Unsupported file payload: neither buffer nor path provided');
    }

    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    return form;
  }

  /**
   * POST a FormData with proper auth headers.
   */
  private postForm<T>(url: string, form: FormData): Promise<AxiosResponse<T>> {
    return this.httpService.axiosRef.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: this.baseAuthHeaders.headers?.Authorization,
      },
      maxBodyLength: Infinity,
    });
  }

  /**
   * Upload a file OR send a JSON payload depending on the file type (string URL vs Multer file).
   * Used by resizeAndSavePoster / resizeAndSaveLogo.
   */
  private async postFileOrUrl<T>(
    url: string,
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
    filenamePrefix: string,
    scope: string,
  ): Promise<Res<T>> {
    try {
      let result: AxiosResponse<Res<T>>;

      if (typeof file === 'string') {
        const payload: ResizeAndSafeLogoPayloadDto = { movieId, url: file, type };
        result = await this.httpService.axiosRef.post<Res<T>>(url, payload, this.baseAuthHeaders);
      } else {
        const ext = path.extname(file.originalname).replace(/^\./, '');
        const filename = ext ? `${filenamePrefix}.${ext}` : filenamePrefix;
        const form = this.buildForm(file, filename, {
          movieId: movieId.toString(),
          type,
        });
        result = await this.postForm<Res<T>>(url, form);
      }

      if (!result?.data?.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, scope);
    }
  }

  // ─── Bridge void actions ────────────────────────────────────────

  bridgeRunByList(payload: DownloaderRunByListInputDto): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.RUN_BY_LIST),
      payload,
      this.bridgeRunByList.name,
    );
  }

  bridgeFindFilms(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.FILMS, BRIDGE.FIND),
      {},
      this.bridgeFindFilms.name,
    );
  }

  bridgeDownloadFilms(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.FILMS, BRIDGE.DOWNLOAD),
      {},
      this.bridgeDownloadFilms.name,
    );
  }

  bridgeFindCartoons(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.CARTOONS, BRIDGE.FIND),
      {},
      this.bridgeFindCartoons.name,
    );
  }

  bridgeDownloadCartoons(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.CARTOONS, BRIDGE.DOWNLOAD),
      {},
      this.bridgeDownloadCartoons.name,
    );
  }

  bridgeFindSerials(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.SERIALS, BRIDGE.FIND),
      {},
      this.bridgeFindSerials.name,
    );
  }

  bridgeDownloadSerials(): Promise<void> {
    return this.postVoid(
      this.url(BRIDGE.MAIN, BRIDGE.SERIALS, BRIDGE.DOWNLOAD),
      {},
      this.bridgeDownloadSerials.name,
    );
  }

  // ─── Bridge request/response actions ────────────────────────────

  cancelBridgeProcess(): Promise<Res<{ message: string }>> {
    return this.postResult(this.url(BRIDGE.MAIN, BRIDGE.CANCEL), {}, this.cancelBridgeProcess.name);
  }

  bridgeReconcileSerialByKpId(kpId: string): Promise<Res<{ message: string }>> {
    return this.postResult(
      this.url(BRIDGE.MAIN, BRIDGE.SERIALS, BRIDGE.RECONCILE),
      { kpId },
      this.bridgeReconcileSerialByKpId.name,
    );
  }

  // ─── Bridge schedule & status ───────────────────────────────────

  async getBridgeSchedule(): Promise<DownloaderTriggerScheduleDto> {
    const result = await this.httpService.axiosRef.get<DownloaderTriggerScheduleDto>(
      this.url(BRIDGE.MAIN, BRIDGE.SCHEDULE),
      this.baseAuthHeaders,
    );
    return result.data;
  }

  async updateBridgeSchedule(
    schedule: Partial<DownloaderTriggerScheduleDto>,
  ): Promise<DownloaderTriggerScheduleDto> {
    const result = await this.httpService.axiosRef.put<DownloaderTriggerScheduleDto>(
      this.url(BRIDGE.MAIN, BRIDGE.SCHEDULE),
      schedule,
      this.baseAuthHeaders,
    );
    return result.data;
  }

  async getBridgeStatus(): Promise<DownloaderTriggerTaskRuntimeStatusDto> {
    const result = await this.httpService.axiosRef.get<DownloaderTriggerTaskRuntimeStatusDto>(
      this.url(BRIDGE.MAIN, BRIDGE.STATUS),
      this.baseAuthHeaders,
    );
    return result.data;
  }

  // ─── Logs ───────────────────────────────────────────────────────

  clearLogs(keys: string[]): Promise<Res<null>> {
    const payload: ClearConverterLogsPayloadDto = { keys };
    return this.postResult(
      this.url(CONVERTER.MAIN, CONVERTER.LOGS, CONVERTER.CLEAR),
      payload,
      this.clearLogs.name,
    );
  }

  // ─── Movies ─────────────────────────────────────────────────────

  removeMovie(key: string): Promise<Res<null>> {
    const payload: RemoveMoviePayloadDto = { key };
    return this.postResult(this.url(MOVIES.MAIN, MOVIES.REMOVE), payload, this.removeMovie.name);
  }

  addMovieToQueue(
    torrent: TorApiMovieById,
    provider: TorApiProvidersEnum,
    type: MovieTypesEnum,
  ): Promise<Res<null>> {
    const payload: AddMovieToDownloadQueuePayloadDto = { torrent, provider, type };
    return this.postResult(
      this.url(MOVIES.MAIN, MOVIES.ADD_TO_QUEUE),
      payload,
      this.addMovieToQueue.name,
    );
  }

  // ─── Media URL signing ──────────────────────────────────────────

  async signMediaUrl(url: string | null, expiresInSec: number = 900): Promise<string | null> {
    if (!url) return null;

    try {
      const result = await this.httpService.axiosRef.post<Res<string>>(
        this.url(DOWNLOADER.MAIN, DOWNLOADER.SIGN_URL),
        { url, expiresInSec },
        this.baseAuthHeaders,
      );

      if (result.data.appResult !== AppNotificationResultEnum.Success || !result.data.data) {
        return url;
      }

      return result.data.data;
    } catch (error) {
      this.logger.error(error, this.signMediaUrl.name);
      return url;
    }
  }

  // ─── Preview clip download ──────────────────────────────────────

  async downloadPreviewClip(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    const clipUrl = this.url(DOWNLOADER.MAIN, DOWNLOADER.YT_CLIP, DOWNLOADER.DOWNLOAD);

    try {
      let result: AxiosResponse<Res<string>> | null = null;

      if (typeof file === 'string') {
        const payload: DownloadPreviewYtClipPayloadDto = { movieId, url: file, type };
        result = await this.httpService.axiosRef.post<Res<string>>(
          clipUrl,
          payload,
          this.baseAuthHeaders,
        );
      } else {
        const ext = path.extname(file.originalname).replace(/^\./, '');
        const filename = ext ? `background.${ext}` : 'background';
        const form = this.buildForm(file, filename, {
          movieId: movieId.toString(),
          type,
        });
        const mime = file.mimetype as 'image/' | 'video/';

        if (mime.startsWith('image/')) {
          result = await this.postForm<Res<string>>(clipUrl, form);
        } else {
          // Fire-and-forget for video uploads
          void this.postForm(clipUrl, form).catch(error =>
            this.logger.error(error, this.downloadPreviewClip.name),
          );
          result = { data: this.appNotification.success(null) } as AxiosResponse;
        }
      }

      if (!result?.data?.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.downloadPreviewClip.name);
    }
  }

  // ─── Film upload ────────────────────────────────────────────────

  uploadFilm(movieId: number, file: Express.Multer.File, type: MovieTypesEnum): Res<null> {
    try {
      const ext = path.extname(file.originalname).replace(/^\./, '');
      const filename = ext ? `background.${ext}` : 'background';
      const form = this.buildForm(file, filename, {
        movieId: movieId.toString(),
        type,
      });

      void this.postForm(
        this.url(DOWNLOADER.MAIN, DOWNLOADER.MOVIE, DOWNLOADER.UPLOAD),
        form,
      ).catch(error => this.logger.error(error, this.uploadFilm.name));

      return this.appNotification.success(null);
    } catch (error) {
      return this.handleError(error, this.uploadFilm.name);
    }
  }

  // ─── Resize poster & logo ──────────────────────────────────────

  resizeAndSavePoster(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    return this.postFileOrUrl(
      this.url(CONVERTER.MAIN, CONVERTER.POSTER, CONVERTER.RESIZE),
      movieId,
      file,
      type,
      'poster',
      this.resizeAndSavePoster.name,
    );
  }

  resizeAndSaveLogo(
    movieId: number,
    file: string | Express.Multer.File,
    type: MovieTypesEnum,
  ): Promise<Res<string>> {
    return this.postFileOrUrl(
      this.url(CONVERTER.MAIN, CONVERTER.LOGO, CONVERTER.RESIZE),
      movieId,
      file,
      type,
      'logo',
      this.resizeAndSaveLogo.name,
    );
  }

  // ─── Admin avatar upload ────────────────────────────────────────

  async adminUploadAvatar(
    file: Express.Multer.File,
    extension: ImgExtEnum,
    adminId: number,
    currentAvatarPath: string,
  ): Promise<Res<string>> {
    try {
      const form = this.buildForm(file, `avatar.${extension}`, {
        adminId: adminId.toString(),
        extension,
        currentAvatarPath,
      });

      const result = await this.postForm<Res<string>>(
        this.url(USERS_ADMIN.MAIN, USERS_ADMIN.AVATAR, USERS_ADMIN.UPLOAD),
        form,
      );

      if (!result.data.appResult) return this.appNotification.internalServerError();

      return result.data;
    } catch (error) {
      return this.handleError(error, this.adminUploadAvatar.name);
    }
  }
}

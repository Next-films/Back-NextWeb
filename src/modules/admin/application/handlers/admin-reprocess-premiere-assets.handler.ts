import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  AdminPremiereHandleStatusEnum,
  AdminPremiereTypeEnum,
  AdminReprocessPremiereAssetsInputDto,
} from '@/admin/api/dtos/input/admin-get-premieres.input-query.dto';
import { AdminReprocessPremiereAssetsOutputDto } from '@/admin/api/dtos/output/admin-reprocess-premiere-assets.output.dto';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MoviesService } from '@/movies/application/movies.service';
import { ExternalMovieAssetsService } from '@/movies/application/external-movie-assets.service';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { MovieKpMetadata } from '@/movies/domain/types';
import { MovieTypesEnum } from '@/common/types/types';

const REPROCESS_METADATA_CONCURRENCY = 5;

type ReprocessPremiereRow = {
  id: number | string;
  type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;
  kpId: string | null;
  trailerUrl: string | null;
  description: string | null;
  backgroundContentUrl: string | null;
};

export class AdminReprocessPremiereAssetsCommand implements ICommand {
  constructor(public inputDto: AdminReprocessPremiereAssetsInputDto) {}
}

@CommandHandler(AdminReprocessPremiereAssetsCommand)
export class AdminReprocessPremiereAssetsCommandHandler
  implements
    ICommandHandler<
      AdminReprocessPremiereAssetsCommand,
      AppNotificationResult<AdminReprocessPremiereAssetsOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly kinopoiskService: KinopoiskService,
    private readonly moviesService: MoviesService,
    private readonly externalMovieAssetsService: ExternalMovieAssetsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminReprocessPremiereAssetsCommandHandler.name);
  }

  async execute(
    command: AdminReprocessPremiereAssetsCommand,
  ): Promise<
    AppNotificationResult<AdminReprocessPremiereAssetsOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log('Reprocess premiere metadata command', this.execute.name);

    try {
      const rows = await this.getPremieresForReprocess(command.inputDto);
      const result: AdminReprocessPremiereAssetsOutputDto = {
        selected: rows.length,
        processed: 0,
        trailersUpdated: 0,
        descriptionsUpdated: 0,
        backgroundsUpdated: 0,
        unchanged: 0,
        published: 0,
        moderated: 0,
        failed: 0,
        errors: [],
      };
      const onlyMissingMetadata = command.inputDto.onlyMissingAssets ?? true;

      await this.processInChunks(rows, row =>
        this.reprocessPremiereMetadata(row, result, onlyMissingMetadata),
      );

      return this.appNotification.success(result);
    } catch (error) {
      this.logger.error(error, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private async getPremieresForReprocess(
    inputDto: AdminReprocessPremiereAssetsInputDto,
  ): Promise<ReprocessPremiereRow[]> {
    const limit = inputDto.limit ?? 50;
    const type = inputDto.type ?? AdminPremiereTypeEnum.ALL;
    const handleStatus = inputDto.handleStatus ?? AdminPremiereHandleStatusEnum.MODERATE;
    const values: unknown[] = [];
    const queries = this.tables(type).map(table => {
      const conditions = [`m."availabilityStatus" IN ('upcoming', 'released_no_video')`];

      if (handleStatus !== AdminPremiereHandleStatusEnum.ALL) {
        values.push(handleStatus);
        conditions.push(`m."handleStatus" = $${values.length}`);
      }

      if (inputDto.onlyMissingAssets ?? true) {
        conditions.push(`(
          m."trailerUrl" IS NULL
          OR btrim(m."trailerUrl") = ''
          OR m."description" IS NULL
          OR btrim(m."description") = ''
          OR m."backgroundContentUrl" IS NULL
          OR btrim(m."backgroundContentUrl") = ''
          OR lower(split_part(m."backgroundContentUrl", '?', 1)) NOT LIKE '%.webm'
        )`);
      }

      return `
        SELECT
          m."id" AS "id",
          '${table.type}' AS "type",
          m."kpId" AS "kpId",
          m."trailerUrl" AS "trailerUrl",
          m."description" AS "description",
          m."backgroundContentUrl" AS "backgroundContentUrl",
          m."releaseDate" AS "releaseDate",
          m."updatedAt" AS "updatedAt"
        FROM "${table.table}" m
        WHERE ${conditions.join(' AND ')}
      `;
    });

    values.push(limit);
    return this.dataSource.query<ReprocessPremiereRow[]>(
      `
        SELECT "id", "type", "kpId", "trailerUrl", "description", "backgroundContentUrl"
        FROM (${queries.join(' UNION ALL ')}) premieres
        ORDER BY "updatedAt" ASC NULLS FIRST, "releaseDate" ASC NULLS LAST, "id" ASC
        LIMIT $${values.length}
      `,
      values,
    );
  }

  private tables(type?: AdminPremiereTypeEnum): Array<{
    table: string;
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;
  }> {
    const all = [
      { table: 'film', type: AdminPremiereTypeEnum.FILM },
      { table: 'cartoon', type: AdminPremiereTypeEnum.CARTOON },
      { table: 'serial', type: AdminPremiereTypeEnum.SERIAL },
    ] as Array<{ table: string; type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL> }>;

    if (!type || type === AdminPremiereTypeEnum.ALL) return all;
    return all.filter(item => item.type === type);
  }

  private async reprocessPremiereMetadata(
    row: ReprocessPremiereRow,
    result: AdminReprocessPremiereAssetsOutputDto,
    onlyMissingMetadata: boolean,
  ): Promise<void> {
    const metadata = this.createEmptyMetadata();
    const shouldLoadMetadata = this.shouldLoadMetadata(row, onlyMissingMetadata);

    if (shouldLoadMetadata) {
      if (!row.kpId) {
        result.errors.push(`${row.type}:${row.id} has empty kpId`);
      } else {
        const kpMovie = await this.kinopoiskService.getMovieById(Number(row.kpId));

        if (!kpMovie) {
          result.errors.push(`${row.type}:${row.kpId} not found in kinopoisk`);
        } else {
          Object.assign(metadata, this.createMetadata(kpMovie));
          await this.externalMovieAssetsService.enrichUpcomingDescription(
            metadata,
            kpMovie,
            this.movieType(row.type),
          );
          await this.externalMovieAssetsService.enrichUpcomingTrailer(
            metadata,
            kpMovie,
            this.movieType(row.type),
          );
        }
      }
    }

    const trailerUrl = metadata.trailerUrl?.trim() || null;
    const description = metadata.description?.trim() || null;
    const effectiveTrailerUrl =
      this.normalizePoiskkinoEmbedUrl(row.trailerUrl) ||
      this.normalizePoiskkinoEmbedUrl(trailerUrl);
    // Prefer the poiskkino CDN clip built directly from kpId, same as the regular
    // moderation flow (movie-metadata-card.service.ts). trailerUrl coming from
    // Kinopoisk/TMDB is always a YouTube link, so gating this on effectiveTrailerUrl
    // (poiskkino-shaped only) meant reprocessing never actually downloaded anything.
    const backgroundSourceUrl =
      this.buildPoiskkinoCdnHlsUrl(row.kpId, row.type) ||
      effectiveTrailerUrl ||
      trailerUrl ||
      row.trailerUrl?.trim() ||
      null;
    const backgroundContentUrl = await this.reprocessBackgroundContentUrl(
      row,
      backgroundSourceUrl,
      onlyMissingMetadata,
    );

    this.collectMissingMetadataErrors(
      row,
      result,
      { trailerUrl: effectiveTrailerUrl, description, backgroundContentUrl },
      onlyMissingMetadata,
    );

    const updated = await this.updatePremiereMetadata(
      row,
      { trailerUrl, description, backgroundContentUrl },
      { trailerUrl: effectiveTrailerUrl, description, backgroundContentUrl },
      onlyMissingMetadata,
    );

    if (!updated.trailerUpdated && !updated.descriptionUpdated && !updated.backgroundUpdated) {
      result.moderated++;
      result.unchanged++;
      return;
    }

    result.processed++;
    if (updated.trailerUpdated) result.trailersUpdated++;
    if (updated.descriptionUpdated) result.descriptionsUpdated++;
    if (updated.backgroundUpdated) result.backgroundsUpdated++;
  }

  private async processInChunks<T>(items: T[], handler: (item: T) => Promise<void>): Promise<void> {
    for (let index = 0; index < items.length; index += REPROCESS_METADATA_CONCURRENCY) {
      await Promise.all(items.slice(index, index + REPROCESS_METADATA_CONCURRENCY).map(handler));
    }
  }

  private async updatePremiereMetadata(
    row: ReprocessPremiereRow,
    rawMetadata: Pick<MovieKpMetadata, 'trailerUrl' | 'description'> & {
      backgroundContentUrl: string | null;
    },
    metadata: Pick<MovieKpMetadata, 'trailerUrl' | 'description'> & {
      backgroundContentUrl: string | null;
    },
    onlyMissingMetadata: boolean,
  ): Promise<{
    trailerUpdated: boolean;
    descriptionUpdated: boolean;
    backgroundUpdated: boolean;
  }> {
    const tableName = this.tableName(row.type);
    const params: unknown[] = [];
    const setClauses: string[] = [];
    const trailerUpdated = this.shouldUpdateTrailerUrl(
      row.trailerUrl,
      metadata.trailerUrl,
      onlyMissingMetadata,
    );
    const descriptionUpdated = this.shouldUpdateField(
      row.description,
      metadata.description,
      onlyMissingMetadata,
    );
    const backgroundUpdated = this.shouldUpdateBackgroundContentUrl(
      row.backgroundContentUrl,
      metadata.backgroundContentUrl,
      onlyMissingMetadata,
    );

    if (trailerUpdated) {
      params.push(metadata.trailerUrl!.trim());
      setClauses.push(`"trailerUrl" = $${params.length}`);
    }

    if (descriptionUpdated) {
      params.push(rawMetadata.description!.trim());
      setClauses.push(`"description" = $${params.length}`);
    }

    if (backgroundUpdated) {
      params.push(metadata.backgroundContentUrl!.trim());
      setClauses.push(`"backgroundContentUrl" = $${params.length}`);
    }

    if (!setClauses.length) {
      return { trailerUpdated: false, descriptionUpdated: false, backgroundUpdated: false };
    }

    setClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    params.push(row.id);

    const updatedRows = await this.dataSource.query<Array<{ id: number | string }>>(
      `
        UPDATE "${tableName}"
        SET ${setClauses.join(', ')}
        WHERE "id" = $${params.length}
        RETURNING "id"
      `,
      params,
    );

    if (!updatedRows.length) {
      return { trailerUpdated: false, descriptionUpdated: false, backgroundUpdated: false };
    }

    return { trailerUpdated, descriptionUpdated, backgroundUpdated };
  }

  private collectMissingMetadataErrors(
    row: ReprocessPremiereRow,
    result: AdminReprocessPremiereAssetsOutputDto,
    metadata: Pick<MovieKpMetadata, 'trailerUrl' | 'description'> & {
      backgroundContentUrl: string | null;
    },
    onlyMissingMetadata: boolean,
  ): void {
    const missingFields: string[] = [];

    if (
      !this.hasText(metadata.trailerUrl) &&
      this.shouldLookupMissingField(row.trailerUrl, onlyMissingMetadata)
    ) {
      missingFields.push('trailer');
    }

    if (
      !this.hasText(metadata.description) &&
      this.shouldLookupMissingField(row.description, onlyMissingMetadata)
    ) {
      missingFields.push('description');
    }

    if (missingFields.length > 0) {
      result.errors.push(`${row.type}:${row.kpId} ${missingFields.join(', ')} not found`);
    }

    if (
      !this.hasProcessedPreviewClip(metadata.backgroundContentUrl) &&
      this.shouldLookupMissingBackground(row.backgroundContentUrl, onlyMissingMetadata) &&
      this.hasText(metadata.trailerUrl)
    ) {
      result.errors.push(`${row.type}:${row.kpId} background clip not downloaded`);
    }
  }

  private shouldUpdateField(
    currentValue: string | null,
    nextValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    if (!this.hasText(nextValue)) return false;
    if (onlyMissingMetadata && this.hasText(currentValue)) return false;
    return currentValue?.trim() !== nextValue?.trim();
  }

  private shouldUpdateTrailerUrl(
    currentValue: string | null,
    nextValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    const normalizedNextValue = this.normalizePoiskkinoEmbedUrl(nextValue);
    if (!normalizedNextValue) return false;
    if (onlyMissingMetadata && this.normalizePoiskkinoEmbedUrl(currentValue)) return false;
    return this.normalizePoiskkinoEmbedUrl(currentValue) !== normalizedNextValue;
  }

  private shouldUpdateBackgroundContentUrl(
    currentValue: string | null,
    nextValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    if (!this.hasProcessedPreviewClip(nextValue)) return false;
    if (onlyMissingMetadata && this.hasProcessedPreviewClip(currentValue)) return false;
    return currentValue?.trim() !== nextValue?.trim();
  }

  private shouldLookupMissingBackground(
    currentValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    return !onlyMissingMetadata || !this.hasProcessedPreviewClip(currentValue);
  }

  private hasProcessedPreviewClip(value: string | null | undefined): boolean {
    return this.hasMediaExtension(value, '.webm');
  }

  private hasMediaExtension(value: string | null | undefined, extension: string): boolean {
    if (!value?.trim()) return false;

    try {
      const url = new URL(value);
      return url.pathname.toLowerCase().endsWith(extension);
    } catch {
      return value.toLowerCase().split('?')[0].endsWith(extension);
    }
  }

  private async reprocessBackgroundContentUrl(
    row: ReprocessPremiereRow,
    trailerUrl: string | null,
    onlyMissingMetadata: boolean,
  ): Promise<string | null> {
    if (!this.hasText(trailerUrl)) return null;
    if (onlyMissingMetadata && this.hasProcessedPreviewClip(row.backgroundContentUrl)) return null;

    const movieId = Number(row.id);
    if (!Number.isFinite(movieId)) return null;

    try {
      return await this.moviesService.getBackgroundContentUrl(
        trailerUrl,
        movieId,
        this.movieType(row.type),
      );
    } catch (error) {
      this.logger.warn(String(error), this.reprocessBackgroundContentUrl.name);
      return null;
    }
  }

  private shouldLookupMissingField(
    currentValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    return !onlyMissingMetadata || !this.hasText(currentValue);
  }

  private hasText(value: string | null | undefined): boolean {
    return Boolean(value?.trim());
  }

  private createMetadata(kpMovie: KinopoiskMovie): MovieKpMetadata {
    return {
      name: kpMovie.name || kpMovie.alternativeName || kpMovie.enName || null,
      originalName: kpMovie.enName || kpMovie.alternativeName || null,
      alternativeName: kpMovie.alternativeName || null,
      universe: null,
      studio: null,
      genres: null,
      countries: null,
      description: kpMovie.description || kpMovie.shortDescription || null,
      releaseDate: null,
      posterUrl: null,
      backdropUrl: null,
      backdropUrls: [],
      titleUrl: null,
      trailerUrl: this.moviesService.getKinopoiskTrailerUrl(kpMovie),
    };
  }

  private createEmptyMetadata(): MovieKpMetadata {
    return {
      name: null,
      originalName: null,
      alternativeName: null,
      universe: null,
      studio: null,
      genres: null,
      countries: null,
      description: null,
      releaseDate: null,
      posterUrl: null,
      backdropUrl: null,
      backdropUrls: [],
      titleUrl: null,
      trailerUrl: null,
    };
  }

  private shouldLoadMetadata(row: ReprocessPremiereRow, onlyMissingMetadata: boolean): boolean {
    const needsDescription = this.shouldLookupMissingField(row.description, onlyMissingMetadata);
    const needsPoiskkinoTrailer =
      !this.normalizePoiskkinoEmbedUrl(row.trailerUrl) &&
      this.shouldLookupMissingField(row.trailerUrl, onlyMissingMetadata);

    return needsDescription || needsPoiskkinoTrailer;
  }

  private normalizePoiskkinoEmbedUrl(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;

    try {
      const url = new URL(value.trim());
      if (url.hostname !== 'play.poiskkino.dev' || !url.pathname.startsWith('/embed/')) {
        return null;
      }

      url.protocol = 'https:';
      return url.toString();
    } catch {
      return null;
    }
  }

  private buildPoiskkinoCdnHlsUrl(
    kpId: string | null | undefined,
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>,
  ): string | null {
    const normalizedKpId = kpId?.trim();

    if (!normalizedKpId || !/^\d{4,}$/.test(normalizedKpId)) return null;

    const directory = type === AdminPremiereTypeEnum.SERIAL ? 'tv' : 'film';
    const firstPart = normalizedKpId.slice(0, 2);
    const secondPart = normalizedKpId.slice(2, 4);

    return `https://lbu.vcdn.elvd.tech/hls/${directory}/${firstPart}/${secondPart}/${normalizedKpId}.mp4/master.m3u8`;
  }

  private movieType(
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>,
  ): MovieTypesEnum {
    switch (type) {
      case AdminPremiereTypeEnum.CARTOON:
        return MovieTypesEnum.CARTOON;
      case AdminPremiereTypeEnum.SERIAL:
        return MovieTypesEnum.SERIAL;
      case AdminPremiereTypeEnum.FILM:
      default:
        return MovieTypesEnum.FILM;
    }
  }

  private tableName(
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>,
  ): 'film' | 'cartoon' | 'serial' {
    switch (type) {
      case AdminPremiereTypeEnum.CARTOON:
        return 'cartoon';
      case AdminPremiereTypeEnum.SERIAL:
        return 'serial';
      case AdminPremiereTypeEnum.FILM:
      default:
        return 'film';
    }
  }
}

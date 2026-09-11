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
import { MovieHandleStatus } from '@/movies/domain/types';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { Serial } from '@/serials/domain/serial.entity';

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

      if (command.inputDto.dryRun) {
        return this.appNotification.success(result);
      }

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
          OR (
            lower(split_part(m."trailerUrl", '?', 1)) NOT LIKE '%/trailer/trailer.mp4'
            AND lower(m."trailerUrl") NOT LIKE '%youtube.com/%'
            AND lower(m."trailerUrl") NOT LIKE '%youtu.be/%'
          )
          OR m."description" IS NULL
          OR btrim(m."description") = ''
          OR m."description" !~ '[А-Яа-яЁё]'
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
    try {
      await this.reprocessPremiereMetadataUnsafe(row, result, onlyMissingMetadata);
    } catch (error) {
      result.failed++;
      result.errors.push(`${row.type}:${row.kpId || row.id} ${String(error)}`);
      this.logger.warn(String(error), this.reprocessPremiereMetadata.name);
    }
  }

  private async reprocessPremiereMetadataUnsafe(
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

    const trailerSourceUrl = metadata.trailerUrl?.trim() || null;
    const description = this.moviesService.hasRussianText(metadata.description)
      ? metadata.description!.trim()
      : null;
    const backgroundContentUrl = await this.reprocessBackgroundContentUrl(
      row,
      trailerSourceUrl,
      onlyMissingMetadata,
    );
    const trailerUrl =
      (this.moviesService.isPlayablePremiereTrailer(row.trailerUrl) && row.trailerUrl?.trim()) ||
      this.moviesService.getProcessedTrailerUrl(backgroundContentUrl) ||
      (this.moviesService.isPlayablePremiereTrailer(trailerSourceUrl) ? trailerSourceUrl : null);
    const effectiveBackgroundContentUrl = backgroundContentUrl || row.backgroundContentUrl;

    this.collectMissingMetadataErrors(
      row,
      result,
      { trailerUrl, description, backgroundContentUrl: effectiveBackgroundContentUrl },
      onlyMissingMetadata,
    );

    const updated = await this.updatePremiereMetadata(
      row,
      { trailerUrl, description, backgroundContentUrl },
      { trailerUrl, description, backgroundContentUrl },
      onlyMissingMetadata,
    );

    const handleStatus = await this.refreshPremiereStatus(row);
    if (handleStatus === MovieHandleStatus.PRODUCTION) result.published++;
    else result.moderated++;

    if (!updated.trailerUpdated && !updated.descriptionUpdated && !updated.backgroundUpdated) {
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
    const descriptionUpdated = this.shouldUpdateDescription(
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

  private shouldUpdateDescription(
    currentValue: string | null,
    nextValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    if (!this.moviesService.hasRussianText(nextValue)) return false;
    if (onlyMissingMetadata && this.moviesService.hasRussianText(currentValue)) return false;
    return currentValue?.trim() !== nextValue?.trim();
  }

  private shouldUpdateTrailerUrl(
    currentValue: string | null,
    nextValue: string | null,
    onlyMissingMetadata: boolean,
  ): boolean {
    if (!this.moviesService.isPlayablePremiereTrailer(nextValue)) return false;
    if (onlyMissingMetadata && this.moviesService.isPlayablePremiereTrailer(currentValue)) {
      return false;
    }
    return currentValue?.trim() !== nextValue?.trim();
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
    if (
      onlyMissingMetadata &&
      this.hasProcessedPreviewClip(row.backgroundContentUrl) &&
      this.moviesService.isPlayablePremiereTrailer(row.trailerUrl)
    ) {
      return null;
    }

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
      description: this.moviesService.hasRussianText(kpMovie.description)
        ? kpMovie.description!.trim()
        : this.moviesService.hasRussianText(kpMovie.shortDescription)
        ? kpMovie.shortDescription!.trim()
        : null,
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
    if (!onlyMissingMetadata) return true;

    const needsDescription = !this.moviesService.hasRussianText(row.description);
    const needsTrailer = !this.moviesService.isPlayablePremiereTrailer(row.trailerUrl);
    const needsBackground = !this.hasProcessedPreviewClip(row.backgroundContentUrl);

    return needsDescription || needsTrailer || needsBackground;
  }

  private async refreshPremiereStatus(row: ReprocessPremiereRow): Promise<MovieHandleStatus> {
    const target = this.entityTarget(row.type);
    const repository = this.dataSource.getRepository(target);
    const movie = await repository.findOne({
      where: { id: Number(row.id) },
      relations: { genres: true },
    });

    if (!movie) return MovieHandleStatus.MODERATE;

    this.moviesService.setHandleProductionStatusForPremiere(movie);
    await repository.save(movie);
    return movie.handleStatus;
  }

  private entityTarget(
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>,
  ): typeof Film | typeof Cartoon | typeof Serial {
    switch (type) {
      case AdminPremiereTypeEnum.CARTOON:
        return Cartoon;
      case AdminPremiereTypeEnum.SERIAL:
        return Serial;
      case AdminPremiereTypeEnum.FILM:
      default:
        return Film;
    }
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

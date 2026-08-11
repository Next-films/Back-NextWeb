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

const REPROCESS_TRAILER_CONCURRENCY = 5;

type ReprocessPremiereRow = {
  id: number | string;
  type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;
  kpId: string | null;
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
    this.logger.log('Reprocess premiere trailers command', this.execute.name);

    try {
      const rows = await this.getPremieresForReprocess(command.inputDto);
      const result: AdminReprocessPremiereAssetsOutputDto = {
        selected: rows.length,
        processed: 0,
        published: 0,
        moderated: 0,
        failed: 0,
        errors: [],
      };
      const onlyMissingTrailers = command.inputDto.onlyMissingAssets ?? true;

      await this.processInChunks(rows, row =>
        this.reprocessPremiereTrailer(row, result, onlyMissingTrailers),
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
      const conditions = [`m."availabilityStatus" = 'upcoming'`];

      if (handleStatus !== AdminPremiereHandleStatusEnum.ALL) {
        values.push(handleStatus);
        conditions.push(`m."handleStatus" = $${values.length}`);
      }

      if (inputDto.onlyMissingAssets ?? true) {
        conditions.push(`(
          m."trailerUrl" IS NULL
          OR btrim(m."trailerUrl") = ''
        )`);
      }

      return `
        SELECT
          m."id" AS "id",
          '${table.type}' AS "type",
          m."kpId" AS "kpId",
          m."releaseDate" AS "releaseDate",
          m."updatedAt" AS "updatedAt"
        FROM "${table.table}" m
        WHERE ${conditions.join(' AND ')}
      `;
    });

    values.push(limit);
    return this.dataSource.query<ReprocessPremiereRow[]>(
      `
        SELECT "id", "type", "kpId"
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

  private async reprocessPremiereTrailer(
    row: ReprocessPremiereRow,
    result: AdminReprocessPremiereAssetsOutputDto,
    onlyMissingTrailers: boolean,
  ): Promise<void> {
    if (!row.kpId) {
      result.failed++;
      result.errors.push(`${row.type}:${row.id} has empty kpId`);
      return;
    }

    const kpMovie = await this.kinopoiskService.getMovieById(Number(row.kpId));
    if (!kpMovie) {
      result.failed++;
      result.errors.push(`${row.type}:${row.kpId} not found in kinopoisk`);
      return;
    }

    const metadata = this.createTrailerMetadata(kpMovie);
    await this.externalMovieAssetsService.enrichUpcomingTrailer(
      metadata,
      kpMovie,
      this.movieType(row.type),
    );

    const trailerUrl = metadata.trailerUrl?.trim() || null;
    if (!trailerUrl) {
      result.moderated++;
      result.errors.push(`${row.type}:${row.kpId} trailer not found`);
      return;
    }

    const updated = await this.updateTrailerUrl(row, trailerUrl, onlyMissingTrailers);
    if (!updated) {
      result.moderated++;
      return;
    }

    result.processed++;
  }

  private async processInChunks<T>(items: T[], handler: (item: T) => Promise<void>): Promise<void> {
    for (let index = 0; index < items.length; index += REPROCESS_TRAILER_CONCURRENCY) {
      await Promise.all(items.slice(index, index + REPROCESS_TRAILER_CONCURRENCY).map(handler));
    }
  }

  private async updateTrailerUrl(
    row: ReprocessPremiereRow,
    trailerUrl: string,
    onlyMissingTrailers: boolean,
  ): Promise<boolean> {
    const tableName = this.tableName(row.type);
    const onlyMissingCondition = onlyMissingTrailers
      ? `AND ("trailerUrl" IS NULL OR btrim("trailerUrl") = '')`
      : '';
    const updatedRows = await this.dataSource.query<Array<{ id: number | string }>>(
      `
        UPDATE "${tableName}"
        SET "trailerUrl" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $2 ${onlyMissingCondition}
        RETURNING "id"
      `,
      [trailerUrl, row.id],
    );

    return updatedRows.length > 0;
  }

  private createTrailerMetadata(kpMovie: KinopoiskMovie): MovieKpMetadata {
    return {
      name: kpMovie.name || kpMovie.alternativeName || kpMovie.enName || null,
      originalName: kpMovie.enName || kpMovie.alternativeName || null,
      alternativeName: kpMovie.alternativeName || null,
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
      trailerUrl: this.moviesService.getKinopoiskTrailerUrl(kpMovie),
    };
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

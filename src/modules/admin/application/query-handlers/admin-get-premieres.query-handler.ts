import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  AdminGetPremieresInputQueryDto,
  AdminGetPremieresSortFieldEnum,
  AdminPremiereAvailabilityStatusEnum,
  AdminPremiereTypeEnum,
} from '@/admin/api/dtos/input/admin-get-premieres.input-query.dto';
import { AdminPremiereOutputDto } from '@/admin/api/dtos/output/admin-premieres.output.dto';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';
import { Genre } from '@/movies/domain/genre.entity';

export class AdminGetPremieresQuery implements IQuery {
  constructor(public query: AdminGetPremieresInputQueryDto) {}
}

type PremiereRow = {
  id: number | string;
  type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;
  kpId: string | null;
  name: string | null;
  originalTitle: string | null;
  alternativeTitles: string | null;
  description: string | null;
  duration: number | null;
  genres: Genre[] | null;
  universe: string | null;
  studio: string | null;
  releaseDate: string | null;
  country: string[] | null;
  isHidden: boolean;
  status: string;
  availabilityStatus: MovieAvailabilityStatus;
  createdAt: Date;
  updatedAt: Date | null;
  movieUrl: string | null;
  trailerUrl: string | null;
  previewUrl: string | null;
  backgroundUrl: string | null;
  titleUrl: string | null;
};

@QueryHandler(AdminGetPremieresQuery)
export class AdminGetPremieresQueryHandler
  implements
    IQueryHandler<
      AdminGetPremieresQuery,
      AppNotificationResult<PaginationUtil<AdminPremiereOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly paginationUtil: PaginationUtil,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminGetPremieresQueryHandler.name);
  }

  async execute(
    query: AdminGetPremieresQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<AdminPremiereOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    this.logger.log(`Get premieres by admin query`, this.execute.name);

    try {
      const { page, size } = query.query;
      const { sql, values } = this.buildUnionQuery(query.query);
      const countRows = await this.dataSource.query<{ total: string }[]>(
        `SELECT COUNT(*)::int AS total FROM (${sql}) premieres`,
        values,
      );
      const totalCount = Number(countRows[0]?.total || 0);
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      if (!this.paginationUtil.isValidPage(page, pagesCount, totalCount)) {
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });
      }

      const sortField = this.sortField(query.query.sortField);
      const sortDirection = query.query.sortDirection;
      const paginatedValues = [
        ...values,
        this.paginationUtil.calculatePaginationSkip(page, size),
        size,
      ];
      const rows = await this.dataSource.query<PremiereRow[]>(
        `${sql} ORDER BY CASE WHEN "status" = '${
          MovieHandleStatus.MODERATE
        }' THEN 0 ELSE 1 END ASC, "${sortField}" ${sortDirection}, "id" ASC OFFSET $${
          values.length + 1
        } LIMIT $${values.length + 2}`,
        paginatedValues,
      );

      const items = rows.map(row => this.mapRow(row));
      return this.appNotification.success(
        this.paginationUtil.create(totalCount, pagesCount, page, size, items),
      );
    } catch (error) {
      this.logger.error(error, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private buildUnionQuery(query: AdminGetPremieresInputQueryDto): {
    sql: string;
    values: unknown[];
  } {
    const values: unknown[] = [];
    const conditions = [`m."availabilityStatus"::text = ANY($1::text[])`];
    values.push(this.availabilityStatuses(query.availabilityStatus));

    if (query.searchName) {
      values.push(`%${query.searchName}%`);
      const index = values.length;
      conditions.push(
        `(m."title" ILIKE $${index} OR m."originalTitle" ILIKE $${index} OR m."alternativeTitles" ILIKE $${index} OR m."kpId" ILIKE $${index})`,
      );
    }

    const where = conditions.join(' AND ');
    const tables = this.tables(query.type);
    const sql = tables.map(table => this.selectFromTable(table, where)).join(' UNION ALL ');

    return { sql, values };
  }

  private availabilityStatuses(
    status?: AdminPremiereAvailabilityStatusEnum,
  ): MovieAvailabilityStatus[] {
    if (status === AdminPremiereAvailabilityStatusEnum.UPCOMING) {
      return [MovieAvailabilityStatus.UPCOMING];
    }

    if (status === AdminPremiereAvailabilityStatusEnum.RELEASED_NO_VIDEO) {
      return [MovieAvailabilityStatus.RELEASED_NO_VIDEO];
    }

    return [MovieAvailabilityStatus.UPCOMING, MovieAvailabilityStatus.RELEASED_NO_VIDEO];
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

  private selectFromTable(
    table: {
      table: string;
      type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;
    },
    where: string,
  ): string {
    const readyWhere = this.requiredPremiereWhere();

    return `
      SELECT
        m."id" AS "id",
        '${table.type}' AS "type",
        m."kpId" AS "kpId",
        m."title" AS "name",
        m."originalTitle" AS "originalTitle",
        m."alternativeTitles" AS "alternativeTitles",
        m."description" AS "description",
        m."duration" AS "duration",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object('id', g."id", 'name', g."name")
          ) FILTER (WHERE g."id" IS NOT NULL),
          '[]'::jsonb
        ) AS "genres",
        m."universe" AS "universe",
        m."studio" AS "studio",
        m."releaseDate"::text AS "releaseDate",
        m."country" AS "country",
        m."isHidden" AS "isHidden",
        m."handleStatus" AS "status",
        m."availabilityStatus" AS "availabilityStatus",
        m."createdAt" AS "createdAt",
        m."updatedAt" AS "updatedAt",
        m."videoUrl" AS "movieUrl",
        m."trailerUrl" AS "trailerUrl",
        m."previewUrl" AS "previewUrl",
        m."backgroundContentUrl" AS "backgroundUrl",
        m."titleUrl" AS "titleUrl"
      FROM "${table.table}" m
      LEFT JOIN "${table.table}_genres_genre" mg ON mg."${table.table}Id" = m."id"
      LEFT JOIN "genre" g ON g."id" = mg."genreId"
      WHERE ${where} AND ${readyWhere}
      GROUP BY m."id"
    `;
  }

  private requiredPremiereWhere(): string {
    return `
      m."title" IS NOT NULL
      AND btrim(m."title") <> ''
      AND m."description" IS NOT NULL
      AND btrim(m."description") <> ''
      AND m."releaseDate" IS NOT NULL
      AND m."country" IS NOT NULL
      AND cardinality(m."country") > 0
      AND m."trailerUrl" IS NOT NULL
      AND btrim(m."trailerUrl") <> ''
      AND m."previewUrl" IS NOT NULL
      AND lower(split_part(m."previewUrl", '?', 1)) LIKE '%.webp'
    `;
  }

  private sortField(field: AdminGetPremieresSortFieldEnum): string {
    switch (field) {
      case AdminGetPremieresSortFieldEnum.TITLE:
        return 'name';
      case AdminGetPremieresSortFieldEnum.CREATED_AT:
        return 'createdAt';
      case AdminGetPremieresSortFieldEnum.UPDATED_AT:
        return 'updatedAt';
      case AdminGetPremieresSortFieldEnum.RELEASE_DATE:
      default:
        return 'releaseDate';
    }
  }

  private mapRow(row: PremiereRow): AdminPremiereOutputDto {
    return {
      id: Number(row.id),
      type: row.type,
      kpId: row.kpId,
      name: row.name,
      originalTitle: row.originalTitle,
      alternativeTitles: row.alternativeTitles,
      description: row.description,
      duration: row.duration,
      genres: row.genres || [],
      universe: row.universe,
      studio: row.studio,
      releaseDate: row.releaseDate,
      country: row.country,
      isHidden: row.isHidden,
      status: row.status as AdminPremiereOutputDto['status'],
      availabilityStatus: row.availabilityStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      content: {
        movieUrl: row.movieUrl,
        trailerUrl: row.trailerUrl,
        previewUrl: row.previewUrl,
        backgroundUrl: row.backgroundUrl,
        titleUrl: row.titleUrl,
      },
    };
  }
}

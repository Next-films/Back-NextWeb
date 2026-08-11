import { CommandBus, CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  AdminPremiereHandleStatusEnum,
  AdminPremiereTypeEnum,
  AdminReprocessPremiereAssetsInputDto,
} from '@/admin/api/dtos/input/admin-get-premieres.input-query.dto';
import { AdminReprocessPremiereAssetsOutputDto } from '@/admin/api/dtos/output/admin-reprocess-premiere-assets.output.dto';
import { UpsertUpcomingFilmCommand } from '@/films/application/handlers/upsert-upcoming-film.handler';
import { UpsertUpcomingCartoonCommand } from '@/cartoons/application/handlers/upsert-upcoming-cartoon.handler';
import { UpsertUpcomingSerialCommand } from '@/serials/application/handlers/upsert-upcoming-serial.handler';
import { UpsertUpcomingMovieOutputDto } from '@/movies/api/dtos/output/upsert-upcoming-movie.output.dto';

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
    private readonly commandBus: CommandBus,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminReprocessPremiereAssetsCommandHandler.name);
  }

  async execute(
    command: AdminReprocessPremiereAssetsCommand,
  ): Promise<
    AppNotificationResult<AdminReprocessPremiereAssetsOutputDto, ErrorFieldExceptionDto | null>
  > {
    this.logger.log('Reprocess premiere assets command', this.execute.name);

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

      for (const row of rows) {
        if (!row.kpId) {
          result.failed++;
          result.errors.push(`${row.type}:${row.id} has empty kpId`);
          continue;
        }

        const reprocessResult = await this.commandBus.execute<
          UpsertUpcomingFilmCommand | UpsertUpcomingCartoonCommand | UpsertUpcomingSerialCommand,
          AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
        >(this.createUpsertCommand(row.type, row.kpId));

        if (reprocessResult.appResult !== AppNotificationResultEnum.Success) {
          result.failed++;
          result.errors.push(`${row.type}:${row.kpId} failed with ${reprocessResult.appResult}`);
          continue;
        }

        result.processed++;
        if (reprocessResult.data?.published) result.published++;
        else result.moderated++;
      }

      return this.appNotification.success(result);
    } catch (error) {
      this.logger.error(error, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private async getPremieresForReprocess(
    inputDto: AdminReprocessPremiereAssetsInputDto,
  ): Promise<ReprocessPremiereRow[]> {
    const limit = inputDto.limit ?? 3;
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
          OR m."previewUrl" IS NULL
          OR lower(split_part(m."previewUrl", '?', 1)) NOT LIKE '%.webp'
          OR m."horizontalPreviewUrl" IS NULL
          OR lower(split_part(m."horizontalPreviewUrl", '?', 1)) NOT LIKE '%.webp'
          OR m."backgroundContentUrl" IS NULL
          OR lower(split_part(m."backgroundContentUrl", '?', 1)) NOT LIKE '%.webm'
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

  private createUpsertCommand(
    type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>,
    kpId: string,
  ) {
    switch (type) {
      case AdminPremiereTypeEnum.CARTOON:
        return new UpsertUpcomingCartoonCommand({ kpId });
      case AdminPremiereTypeEnum.SERIAL:
        return new UpsertUpcomingSerialCommand({ kpId });
      case AdminPremiereTypeEnum.FILM:
      default:
        return new UpsertUpcomingFilmCommand({ kpId });
    }
  }
}

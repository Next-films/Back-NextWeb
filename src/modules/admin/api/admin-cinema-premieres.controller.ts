import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  AdminGetPremieresInputQueryDto,
  AdminReprocessPremiereAssetsInputDto,
  AdminUpsertPremiereInputDto,
  AdminUpsertPremiereTypeEnum,
} from '@/admin/api/dtos/input/admin-get-premieres.input-query.dto';
import { AdminPremiereOutputDto } from '@/admin/api/dtos/output/admin-premieres.output.dto';
import { AdminGetPremieresQuery } from '@/admin/application/query-handlers/admin-get-premieres.query-handler';
import { UpsertUpcomingFilmCommand } from '@/films/application/handlers/upsert-upcoming-film.handler';
import { UpsertUpcomingCartoonCommand } from '@/cartoons/application/handlers/upsert-upcoming-cartoon.handler';
import { UpsertUpcomingSerialCommand } from '@/serials/application/handlers/upsert-upcoming-serial.handler';
import { AdminReprocessPremiereAssetsCommand } from '@/admin/application/handlers/admin-reprocess-premiere-assets.handler';
import { AdminReprocessPremiereAssetsOutputDto } from '@/admin/api/dtos/output/admin-reprocess-premiere-assets.output.dto';
import { UpsertUpcomingMovieOutputDto } from '@/movies/api/dtos/output/upsert-upcoming-movie.output.dto';

@ApiTags('Admin cinema - premieres')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.PREMIERES}`)
export class AdminCinemaPremieresController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaPremieresController.name);
  }

  @Get()
  async getPremieres(
    @Query() query: AdminGetPremieresInputQueryDto,
  ): Promise<PaginationUtil<AdminPremiereOutputDto[]> | void> {
    this.logger.log('Execute: get premieres by admin', this.getPremieres.name);

    const result = await this.queryBus.execute<
      AdminGetPremieresQuery,
      AppNotificationResult<PaginationUtil<AdminPremiereOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new AdminGetPremieresQuery(query));

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Post('upsert')
  @HttpCode(HttpStatus.CREATED)
  async upsertPremiere(@Body() body: AdminUpsertPremiereInputDto): Promise<void> {
    this.logger.log('Execute: upsert premiere by admin', this.upsertPremiere.name);

    const result = await this.commandBus.execute<
      UpsertUpcomingFilmCommand | UpsertUpcomingCartoonCommand | UpsertUpcomingSerialCommand,
      AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
    >(this.createUpsertCommand(body.type, body.kpId));

    this.appNotification.handleHttpResult(result);
  }

  @Post('reprocess-assets')
  @HttpCode(HttpStatus.OK)
  async reprocessPremiereAssets(
    @Body() body: AdminReprocessPremiereAssetsInputDto,
  ): Promise<AdminReprocessPremiereAssetsOutputDto | void> {
    this.logger.log(
      'Execute: reprocess premiere assets by admin',
      this.reprocessPremiereAssets.name,
    );

    const result = await this.commandBus.execute<
      AdminReprocessPremiereAssetsCommand,
      AppNotificationResult<AdminReprocessPremiereAssetsOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminReprocessPremiereAssetsCommand(body));

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  private createUpsertCommand(
    type: AdminUpsertPremiereTypeEnum,
    kpId: string,
  ): UpsertUpcomingFilmCommand | UpsertUpcomingCartoonCommand | UpsertUpcomingSerialCommand {
    switch (type) {
      case AdminUpsertPremiereTypeEnum.CARTOON:
        return new UpsertUpcomingCartoonCommand({ kpId });
      case AdminUpsertPremiereTypeEnum.SERIAL:
        return new UpsertUpcomingSerialCommand({ kpId });
      case AdminUpsertPremiereTypeEnum.FILM:
      default:
        return new UpsertUpcomingFilmCommand({ kpId });
    }
  }
}

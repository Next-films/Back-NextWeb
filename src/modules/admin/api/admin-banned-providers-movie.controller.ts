import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE } from '@/common/constants/route.constants';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminBanUnbanProviderMovieInputDto } from '@/admin/api/dtos/input/ban-unban-provider-movie.input.dto';
import { AdminBanOrUnbanProviderMovieCommand } from '@/admin/application/handlers/admin-ban-or-unban-provider-movie.handler';
import { SwaggerDecoratorAdminBanOrUnbanProviderMovie } from '@/admin/api/swagger/admin-ban-or-unban-provider-movie.swagger.decorator';
import { GetAllBannedProvidersMoviesInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-banned-providers-movies.input-query.dto';
import { SwaggerDecoratorAdminGetAllBannedProvidersMovies } from '@/admin/api/swagger/admin-get-all-banned-providers-movies.swagger.decorator';
import { AdminGetAllBannedProvidersMoviesQuery } from '@/admin/application/query-handlers/admin-get-all-banned-providers-movies.query-handler';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminBannedProvidersMoviesOutputDto } from '@/admin/api/dtos/output/admin-banned-providers-movies.output.dto';
import { AdminUpdateBannedProviderMovieCommand } from '@/admin/application/handlers/admin-update-banned-provider-movie.handler';
import { AdminUpdateBannedProviderMovieInputDto } from '@/admin/api/dtos/input/admin-update-banned-provider-movie.input.dto';
import { SwaggerDecoratorAdminUpdateBannedProviderMovie } from '@/admin/api/swagger/admin-update-banned-provider-movie.swagger.decorator';

@ApiTags('Admin - banned providers movies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@Controller(ADMIN_BANNED_PROVIDERS_MOVIES_ROUTE.MAIN)
export class AdminBannedProvidersMovieController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminBannedProvidersMovieController.name);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post()
  @SwaggerDecoratorAdminBanOrUnbanProviderMovie()
  async banOrUnbanProviderMovie(@Body() body: AdminBanUnbanProviderMovieInputDto): Promise<void> {
    this.logger.log('Execute: ban or unban provider movie', this.banOrUnbanProviderMovie.name);
    const result = await this.commandBus.execute<
      AdminBanOrUnbanProviderMovieCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminBanOrUnbanProviderMovieCommand(body));

    this.logger.log(result.appResult, this.banOrUnbanProviderMovie.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':bannedProviderMovieId')
  @SwaggerDecoratorAdminUpdateBannedProviderMovie()
  async updateBannedProviderMovie(
    @Param('bannedProviderMovieId') bannedProviderMovieId: number,
    @Body() body: AdminUpdateBannedProviderMovieInputDto,
  ): Promise<void> {
    this.logger.log('Execute: ban or unban provider movie', this.updateBannedProviderMovie.name);
    const result = await this.commandBus.execute<
      AdminUpdateBannedProviderMovieCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminUpdateBannedProviderMovieCommand(bannedProviderMovieId, body));

    this.logger.log(result.appResult, this.updateBannedProviderMovie.name);

    this.appNotification.handleHttpResult(result);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllBannedProvidersMovies()
  async getBannedProvidersMovies(
    @Query() query: GetAllBannedProvidersMoviesInputQueryDto,
  ): Promise<PaginationUtil<AdminBannedProvidersMoviesOutputDto[]> | void> {
    this.logger.log('Execute: get banned providers movies', this.getBannedProvidersMovies.name);

    const result = await this.queryBus.execute<
      AdminGetAllBannedProvidersMoviesQuery,
      AppNotificationResult<
        PaginationUtil<AdminBannedProvidersMoviesOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllBannedProvidersMoviesQuery(query));

    this.logger.log(result.appResult, this.getBannedProvidersMovies.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

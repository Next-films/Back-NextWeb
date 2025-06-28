import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_MODERATION_MOVIE_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { SwaggerDecoratorAdminGetAllModerationMovieTask } from '@/admin/api/swagger/admin-get-all-moderation-movie-task.swagger.decorator';
import { SwaggerDecoratorAdminApplyModerationMovieTask } from '@/admin/api/swagger/admin-apply-moderation-movie-task.swagger.decorator';
import { SwaggerDecoratorAdminCancelModerationMovieTask } from '@/admin/api/swagger/admin-cancel-moderation-movie-task.swagger.decorator';
import { SwaggerDecoratorAdminAcceptModerationMovieTask } from '@/admin/api/swagger/admin-accept-moderation-movie-task.swagger.decorator';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { AdminAcceptModerationMovieTaskCommand } from '@/admin/application/handlers/admin-accept-moderation-movie-task.handler';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { AdminAcceptModerationMovieTaskInputDto } from '@/admin/api/dtos/input/admin-accept-moderation-movie-task.input.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { GetAllModerationMovieTaskInputQueryDto } from '@/admin/api/dtos/input/get-all-moderation-movie-task.input-query.dto';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  AdminModerationMovieTaskByIdOutputDto,
  AdminModerationMovieTaskOutputDto,
} from '@/admin/api/dtos/output/admin-moderation-movie-task.output.dto';
import { AdminGetAllModerationMovieTaskQuery } from '@/admin/application/query-handlers/admin-get-all-moderation-movie-task.query-handler';
import { SwaggerDecoratorAdminGetModerationMovieTaskById } from '@/admin/api/swagger/admin-get-moderation-movie-task-by-id.swagger.decorator';
import { AdminGetModerationMovieTaskByIdQuery } from '@/admin/application/query-handlers/admin-get-moderation-movie-task-by-id.query-handler';
import { GetModerationMovieTaskByIdInputQueryDto } from '@/admin/api/dtos/input/get-moderation-movie-task-by-id.input-query.dto';
import { AdminCancelModerationMovieTaskCommand } from '@/admin/application/handlers/admin-cancel-moderation-movie-task.handler';
import { AdminCancelModerationMovieTaskInputDto } from '@/admin/api/dtos/input/admin-cancel-moderation-movie-task.input.dto';

@ApiTags('Admin moderation - movie')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(ADMIN_MODERATION_MOVIE_ROUTE.MAIN)
export class AdminModerationMovieController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminModerationMovieController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllModerationMovieTask()
  async getAllModerationTask(
    @Query() query: GetAllModerationMovieTaskInputQueryDto,
  ): Promise<PaginationUtil<AdminModerationMovieTaskOutputDto[]> | void> {
    this.logger.log('Execute: Get all moderation movie task', this.getAllModerationTask.name);

    const result = await this.queryBus.execute<
      AdminGetAllModerationMovieTaskQuery,
      AppNotificationResult<
        PaginationUtil<AdminModerationMovieTaskOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllModerationMovieTaskQuery(query));

    this.logger.log(result.appResult, this.getAllModerationTask.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(':taskId')
  @SwaggerDecoratorAdminGetModerationMovieTaskById()
  async getModerationTaskById(
    @Param('taskId', ParseIntPatchPipe) taskId: number,
    @Query() query: GetModerationMovieTaskByIdInputQueryDto,
  ): Promise<AdminModerationMovieTaskByIdOutputDto | void> {
    this.logger.log('Execute: Get moderation movie task by id', this.getModerationTaskById.name);

    const result = await this.queryBus.execute<
      AdminGetModerationMovieTaskByIdQuery,
      AppNotificationResult<AdminModerationMovieTaskByIdOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminGetModerationMovieTaskByIdQuery(taskId, query.type));

    this.logger.log(result.appResult, this.getModerationTaskById.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(`:taskId/${ADMIN_MODERATION_MOVIE_ROUTE.ACCEPT}`)
  @SwaggerDecoratorAdminAcceptModerationMovieTask()
  async acceptModerationTask(
    @Param('taskId', ParseIntPatchPipe) taskId: number,
    @Body() body: AdminAcceptModerationMovieTaskInputDto,
    @CurrentUser() admin: AdminAccessTokenPayload,
  ): Promise<void> {
    this.logger.log('Execute: accept moderation movie task', this.acceptModerationTask.name);
    const result = await this.commandBus.execute<
      AdminAcceptModerationMovieTaskCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminAcceptModerationMovieTaskCommand(taskId, body.type, admin.id));

    this.logger.log(result.appResult, this.acceptModerationTask.name);
    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @Post(`:taskId/${ADMIN_MODERATION_MOVIE_ROUTE.APPLY}`)
  @SwaggerDecoratorAdminApplyModerationMovieTask()
  async applyMovie(): Promise<void> {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(`:taskId/${ADMIN_MODERATION_MOVIE_ROUTE.CANCEL}`)
  @SwaggerDecoratorAdminCancelModerationMovieTask()
  async cancelMovie(
    @Param('taskId', ParseIntPatchPipe) taskId: number,
    @Body() body: AdminCancelModerationMovieTaskInputDto,
    @CurrentUser() admin: AdminAccessTokenPayload,
  ): Promise<void> {
    this.logger.log('Execute: cancel moderation movie task', this.cancelMovie.name);
    const result = await this.commandBus.execute<
      AdminCancelModerationMovieTaskCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminCancelModerationMovieTaskCommand(taskId, body.type, admin.id));

    this.logger.log(result.appResult, this.cancelMovie.name);
    this.appNotification.handleHttpResult(result);
  }
}

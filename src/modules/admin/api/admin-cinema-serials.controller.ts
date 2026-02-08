import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { SwaggerDecoratorAdminGetAllSerials } from '@/admin/api/swagger/admin-get-all-serials.swagger.decorator';
import { SwaggerDecoratorAdminCreateSerial } from '@/admin/api/swagger/admin-add-serial.swagger.decorator';
import { SwaggerDecoratorAdminUpdateSerialById } from '@/admin/api/swagger/admin-update-serial-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveSerialById } from '@/admin/api/swagger/admin-remove-serial-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideSerialById } from '@/admin/api/swagger/admin-show-hide-serial-by-id.swagger.decorator';
import { AdminGetAllSerialsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-serials.input-query.dto';
import { AdminCinemaSerialsOutputDto } from '@/admin/api/dtos/output/admin-cinema-serials.output.dto';
import { AdminUpdateSerialInputDto } from '@/admin/api/dtos/input/admin-update-serial.input.dto';
import { AdminShowOrHiddeSerialInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-serial.input.dto';
import { AdminGetAllSerialsQuery } from '@/admin/application/query-handlers/admin-get-all-serials.query-handler';
import { AdminUpdateSerialCommand } from '@/admin/application/handlers/admin-update-serial.handler';
import { AdminRemoveSerialCommand } from '@/admin/application/handlers/admin-remove-serial.handler';
import { AdminShowOrHiddeSerialCommand } from '@/admin/application/handlers/admin-show-or-hide-serial.handler';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ApiDeprecated } from '@/common/decorators/api-deprecated.swagger.decorator';
import { AdminGetSerialByIdQuery } from '@/admin/application/query-handlers/admin-get-serial-by-id.query-handler';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { storageUtil } from '@/common/utils/storage-big-files.util';
import { unlink } from 'fs/promises';

@ApiTags(
  'Admin cinema - serials. Handles administrative operations for the movie theater content library.',
)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.SERIALS}`)
export class AdminCinemaSerialsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaSerialsController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllSerials()
  async getAllSerials(
    @Query() query: AdminGetAllSerialsInputQueryDto,
  ): Promise<PaginationUtil<AdminCinemaSerialsOutputDto[]> | void> {
    this.logger.log('Execute: get all serials by admin', this.getAllSerials.name);

    const result = await this.queryBus.execute<
      AdminGetAllSerialsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaSerialsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllSerialsQuery(query));

    this.logger.log(result.appResult, this.getAllSerials.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @ApiDeprecated()
  @Post()
  @SwaggerDecoratorAdminCreateSerial()
  addSerial() {
    throw new InternalServerErrorException('Method not implemented');
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`:serialId`)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'videoFile', maxCount: 1 },
        { name: 'previewFile', maxCount: 1 },
        { name: 'titleFile', maxCount: 1 },
        { name: 'backgroundFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  @SwaggerDecoratorAdminUpdateSerialById()
  async updateSerial(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Body() body: AdminUpdateSerialInputDto,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      previewFile?: Express.Multer.File[];
      titleFile?: Express.Multer.File[];
      backgroundFile?: Express.Multer.File[];
    },
  ): Promise<AdminCinemaSerialsOutputDto | void> {
    this.logger.log('Execute: update serial by admin', this.updateSerial.name);
    const videoFile = files?.videoFile?.[0];
    const previewFile = files?.previewFile?.[0];
    const titleFile = files?.titleFile?.[0];
    const backgroundFile = files?.backgroundFile?.[0];

    try {
      const result = await this.commandBus.execute<
        AdminUpdateSerialCommand,
        AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
      >(
        new AdminUpdateSerialCommand(serialId, {
          ...body,
          previewFile,
          videoFile,
          titleFile,
          backgroundFile,
        }),
      );

      this.logger.log(result.appResult, this.updateSerial.name);

      if (result.appResult === AppNotificationResultEnum.Success) {
        const serialResult = await this.queryBus.execute<
          AdminGetSerialByIdQuery,
          AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
        >(new AdminGetSerialByIdQuery(serialId));

        return serialResult.data!;
      }

      this.appNotification.handleHttpResult(result);
    } finally {
      if (videoFile?.path) {
        try {
          await unlink(videoFile.path);
          this.logger.log(`Temp video file removed: ${videoFile.path}`);
        } catch (err) {
          this.logger.error(`Failed to delete temp file: ${videoFile.path}`, err);
        }
      }
    }
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:serialId`)
  @SwaggerDecoratorAdminRemoveSerialById()
  async removeSerial(@Param('serialId', ParseIntPatchPipe) serialId: number): Promise<void> {
    this.logger.log('Execute: remove serial by admin', this.removeSerial.name);

    const result = await this.commandBus.execute<
      AdminRemoveSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveSerialCommand(serialId));

    this.logger.log(result.appResult, this.removeSerial.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Patch(`:serialId`)
  @SwaggerDecoratorAdminShowOrHideSerialById()
  async showOrHideSerial(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Body() body: AdminShowOrHiddeSerialInputDto,
  ): Promise<AdminCinemaSerialsOutputDto | void> {
    this.logger.log('Execute: show or hide serial by admin', this.showOrHideSerial.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeSerialCommand(serialId, body));

    this.logger.log(result.appResult, this.showOrHideSerial.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const serialResult = await this.queryBus.execute<
        AdminGetSerialByIdQuery,
        AppNotificationResult<AdminCinemaSerialsOutputDto, ErrorFieldExceptionDto | null>
      >(new AdminGetSerialByIdQuery(serialId));

      return serialResult.data!;
    }

    this.appNotification.handleHttpResult(result);
  }
}

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
import { SwaggerDecoratorAdminGetAllCartoons } from '@/admin/api/swagger/admin-get-all-cartoons.swagger.decorator';
import { SwaggerDecoratorAdminCreateCartoon } from '@/admin/api/swagger/admin-add-cartoon.swagger.decorator';
import { SwaggerDecoratorAdminUpdateCartoonById } from '@/admin/api/swagger/admin-update-cartoon-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveCartoonById } from '@/admin/api/swagger/admin-remove-cartoon-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideCartoonById } from '@/admin/api/swagger/admin-show-hide-cartoon-by-id.swagger.decorator';
import { AdminGetAllCartoonsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-cartoons.input-query.dto';
import { AdminCinemaCartoonsOutputDto } from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';
import { AdminUpdateCartoonInputDto } from '@/admin/api/dtos/input/admin-update-cartoon.input.dto';
import { AdminShowOrHiddeCartoonInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-cartoon.input.dto';
import { AdminGetAllCartoonsQuery } from '@/admin/application/query-handlers/admin-get-all-cartoons.query-handler';
import { AdminUpdateCartoonCommand } from '@/admin/application/handlers/admin-update-cartoon.handler';
import { AdminRemoveCartoonCommand } from '@/admin/application/handlers/admin-remove-cartoon.handler';
import { AdminShowOrHiddeCartoonCommand } from '@/admin/application/handlers/admin-show-or-hide-cartoon.handler';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ApiDeprecated } from '@/common/decorators/api-deprecated.swagger.decorator';
import { AdminGetCartoonByIdQuery } from '@/admin/application/query-handlers/admin-get-cartoon-by-id.query-handler';
import { unlink } from 'fs/promises';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { storageUtil } from '@/common/utils/storage-big-files.util';

@ApiTags(
  'Admin cinema - cartoons. Handles administrative operations for the movie theater content library.',
)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.CARTOONS}`)
export class AdminCinemaCartoonsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaCartoonsController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllCartoons()
  async getAllCartoons(
    @Query() query: AdminGetAllCartoonsInputQueryDto,
  ): Promise<PaginationUtil<AdminCinemaCartoonsOutputDto[]> | void> {
    this.logger.log('Execute: get all cartoons by admin', this.getAllCartoons.name);

    const result = await this.queryBus.execute<
      AdminGetAllCartoonsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaCartoonsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllCartoonsQuery(query));

    this.logger.log(result.appResult, this.getAllCartoons.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @ApiDeprecated()
  @Post()
  @SwaggerDecoratorAdminCreateCartoon()
  addCartoon() {
    throw new InternalServerErrorException('Method not implemented');
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`:cartoonId`)
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
  @SwaggerDecoratorAdminUpdateCartoonById()
  async updateCartoon(
    @Param('cartoonId', ParseIntPatchPipe) cartoonId: number,
    @Body() body: AdminUpdateCartoonInputDto,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      previewFile?: Express.Multer.File[];
      titleFile?: Express.Multer.File[];
      backgroundFile?: Express.Multer.File[];
    },
  ): Promise<AdminCinemaCartoonsOutputDto | void> {
    this.logger.log('Execute: update cartoon by admin', this.updateCartoon.name);

    const videoFile = files?.videoFile?.[0];
    const previewFile = files?.previewFile?.[0];
    const titleFile = files?.titleFile?.[0];
    const backgroundFile = files?.backgroundFile?.[0];

    try {
      const result = await this.commandBus.execute<
        AdminUpdateCartoonCommand,
        AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
      >(
        new AdminUpdateCartoonCommand(cartoonId, {
          ...body,
          videoFile,
          previewFile,
          titleFile,
          backgroundFile,
        }),
      );

      this.logger.log(result.appResult, this.updateCartoon.name);

      this.appNotification.handleHttpResult(result);

      if (result.appResult === AppNotificationResultEnum.Success) {
        const cartoonResult = await this.queryBus.execute<
          AdminGetCartoonByIdQuery,
          AppNotificationResult<AdminCinemaCartoonsOutputDto, ErrorFieldExceptionDto | null>
        >(new AdminGetCartoonByIdQuery(cartoonId));

        return cartoonResult.data!;
      }
    } finally {
      const tempFiles = [videoFile, previewFile, titleFile, backgroundFile]
        .filter(file => file?.path)
        .map(file => file!);

      for (const file of tempFiles) {
        try {
          await unlink(file.path);
          this.logger.log(`Temp file removed: ${file.path}`);
        } catch (err) {
          this.logger.error(`Failed to delete temp file: ${file.path}`, err);
        }
      }
    }
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:cartoonId`)
  @SwaggerDecoratorAdminRemoveCartoonById()
  async removeCartoon(@Param('cartoonId', ParseIntPatchPipe) cartoonId: number): Promise<void> {
    this.logger.log('Execute: remove cartoon by admin', this.removeCartoon.name);

    const result = await this.commandBus.execute<
      AdminRemoveCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveCartoonCommand(cartoonId));

    this.logger.log(result.appResult, this.removeCartoon.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Patch(`:cartoonId`)
  @SwaggerDecoratorAdminShowOrHideCartoonById()
  async showOrHideCartoon(
    @Param('cartoonId', ParseIntPatchPipe) cartoonId: number,
    @Body() body: AdminShowOrHiddeCartoonInputDto,
  ): Promise<AdminCinemaCartoonsOutputDto | void> {
    this.logger.log('Execute: show or hide cartoon by admin', this.showOrHideCartoon.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeCartoonCommand(cartoonId, body));

    this.logger.log(result.appResult, this.showOrHideCartoon.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const cartoonResult = await this.queryBus.execute<
        AdminGetCartoonByIdQuery,
        AppNotificationResult<AdminCinemaCartoonsOutputDto, ErrorFieldExceptionDto | null>
      >(new AdminGetCartoonByIdQuery(cartoonId));

      return cartoonResult.data!;
    }

    this.appNotification.handleHttpResult(result);
  }
}

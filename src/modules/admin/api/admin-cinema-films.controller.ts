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
import { SwaggerDecoratorAdminGetAllFilms } from '@/admin/api/swagger/admin-get-all-films.swagger.decorator';
import { SwaggerDecoratorAdminUpdateFilmById } from '@/admin/api/swagger/admin-update-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveFilmById } from '@/admin/api/swagger/admin-remove-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideFilmById } from '@/admin/api/swagger/admin-show-hide-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminCreateFilm } from '@/admin/api/swagger/admin-add-film.swagger.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminShowOrHiddeFilmCommand } from '@/admin/application/handlers/admin-show-or-hide-film.handler';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { AdminShowOrHiddeFilmInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-film.input.dto';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { AdminGetAllFilmsQuery } from '@/admin/application/query-handlers/admin-get-all-films.query-handler';
import { AdminGetAllFilmsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-films.input-query.dto';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { AdminCinemaFilmsOutputDto } from '@/admin/api/dtos/output/admin-cinema-films.output.dto';
import { AdminUpdateFilmInputDto } from '@/admin/api/dtos/input/admin-update-film.input.dto';
import { AdminUpdateFilmCommand } from '@/admin/application/handlers/admin-update-film.handler';
import { AdminRemoveFilmCommand } from '@/admin/application/handlers/admin-remove-film.handler';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ApiDeprecated } from '@/common/decorators/api-deprecated.swagger.decorator';
import { AdminGetFilmByIdQuery } from '@/admin/application/query-handlers/admin-get-film-by-id.query-handler';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { storageUtil } from '@/common/utils/storage-big-files.util';
import { unlink } from 'fs/promises';

// TODO: Загрузка фильмов по внешнему id вместо внутреного (bucket название папок, везде , фильмы, мульты и тд)
@ApiTags(
  'Admin cinema - films. Handles administrative operations for the movie theater content library.',
)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.FILMS}`)
export class AdminCinemaFilmsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaFilmsController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllFilms()
  async getAllFilms(
    @Query() query: AdminGetAllFilmsInputQueryDto,
  ): Promise<PaginationUtil<AdminCinemaFilmsOutputDto[]> | void> {
    this.logger.log('Execute: get all films by admin', this.getAllFilms.name);

    const result = await this.queryBus.execute<
      AdminGetAllFilmsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaFilmsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllFilmsQuery(query));

    this.logger.log(result.appResult, this.getAllFilms.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @ApiDeprecated()
  @Post()
  @SwaggerDecoratorAdminCreateFilm()
  addFilm() {
    throw new InternalServerErrorException('Method not implemented');
  }

  @HttpCode(HttpStatus.CREATED)
  @Put(`:filmId`)
  @SwaggerDecoratorAdminUpdateFilmById()
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
  async updateFilm(
    @Param('filmId', ParseIntPatchPipe) filmId: number,
    @Body() body: AdminUpdateFilmInputDto,
    @UploadedFiles()
    files: {
      videoFile?: Express.Multer.File[];
      previewFile?: Express.Multer.File[];
      titleFile?: Express.Multer.File[];
      backgroundFile?: Express.Multer.File[];
    },
  ): Promise<AdminCinemaFilmsOutputDto | void> {
    this.logger.log('Execute: update film by admin', this.updateFilm.name);
    const videoFile = files?.videoFile?.[0];
    const previewFile = files?.previewFile?.[0];
    const titleFile = files?.titleFile?.[0];
    const backgroundFile = files?.backgroundFile?.[0];
    try {
      const result = await this.commandBus.execute<
        AdminUpdateFilmCommand,
        AppNotificationResult<null, ValidationErrorsDto | ErrorFieldExceptionDto | null>
      >(
        new AdminUpdateFilmCommand(filmId, {
          ...body,
          previewFile,
          videoFile,
          titleFile,
          backgroundFile,
        }),
      );

      this.logger.log(result.appResult, this.updateFilm.name);

      if (result.appResult === AppNotificationResultEnum.Success) {
        const filmResult = await this.queryBus.execute<
          AdminGetFilmByIdQuery,
          AppNotificationResult<AdminCinemaFilmsOutputDto, ErrorFieldExceptionDto | null>
        >(new AdminGetFilmByIdQuery(filmId));

        return filmResult.data!;
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
  @Delete(`:filmId`)
  @SwaggerDecoratorAdminRemoveFilmById()
  async removeFilm(@Param('filmId', ParseIntPatchPipe) filmId: number): Promise<void> {
    this.logger.log('Execute: remove film by admin', this.removeFilm.name);

    const result = await this.commandBus.execute<
      AdminRemoveFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveFilmCommand(filmId));

    this.logger.log(result.appResult, this.removeFilm.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Patch(`:filmId`)
  @SwaggerDecoratorAdminShowOrHideFilmById()
  async showOrHideFilm(
    @Param('filmId', ParseIntPatchPipe) filmId: number,
    @Body() body: AdminShowOrHiddeFilmInputDto,
  ): Promise<AdminCinemaFilmsOutputDto | void> {
    this.logger.log('Execute: show or hide film by admin', this.showOrHideFilm.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeFilmCommand(filmId, body));

    this.logger.log(result.appResult, this.showOrHideFilm.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const filmResult = await this.queryBus.execute<
        AdminGetFilmByIdQuery,
        AppNotificationResult<AdminCinemaFilmsOutputDto, ErrorFieldExceptionDto | null>
      >(new AdminGetFilmByIdQuery(filmId));

      return filmResult.data!;
    }

    this.appNotification.handleHttpResult(result);
  }
}

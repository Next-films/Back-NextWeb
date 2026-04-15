import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { ADMIN_VIEWER_BUTTON_ROUTE } from '@/common/constants/route.constants';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { storageUtil } from '@/common/utils/storage-big-files.util';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { MovieTypesEnum } from '@/common/types/types';
import { MoviesService } from '@/movies/application/movies.service';
import { CreateViewerButtonInputDto } from '@/viewer-button/api/dtos/input/create-viewer-button.input.dto';
import { UpdateViewerButtonInputDto } from '@/viewer-button/api/dtos/input/update-viewer-button.input.dto';
import { ViewerButtonOutputDto } from '@/viewer-button/api/dtos/output/viewer-button.output.dto';
import { ViewerButton, ViewerButtonCategory } from '@/viewer-button/domain/viewer-button.entity';
import { ViewerButtonRepository } from '@/viewer-button/infrastructure/viewer-button.repository';

type ViewerButtonUploadFiles = {
  hoverVideoFile?: Express.Multer.File[];
};

const VIDEO_UPLOAD_INPUT_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mpeg',
  'video/quicktime',
  'video/x-matroska',
  'video/x-ms-wmv',
];

const VIEWER_BUTTONS_S3_PREFIX = 'viewer-buttons';
const MAX_VIEWER_BUTTONS = 3;

@ApiTags('Admin - viewer buttons. Manage homepage ALL cards.')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(ADMIN_VIEWER_BUTTON_ROUTE.MAIN)
export class AdminViewerButtonController {
  constructor(
    private readonly logger: LoggerService,
    private readonly viewerButtonRepository: ViewerButtonRepository,
    private readonly moviesService: MoviesService,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminViewerButtonController.name);
  }

  private pickFile(
    files: ViewerButtonUploadFiles | undefined,
    field: keyof ViewerButtonUploadFiles,
  ) {
    return files?.[field]?.[0];
  }

  private validateUploadFiles(files: { hoverVideoFile?: Express.Multer.File }): void {
    const { hoverVideoFile } = files;

    if (
      hoverVideoFile &&
      (!hoverVideoFile.mimetype || !VIDEO_UPLOAD_INPUT_MIME_TYPES.includes(hoverVideoFile.mimetype))
    ) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: 'hoverVideoFile',
              message: `Invalid video mime type. Allowed: ${VIDEO_UPLOAD_INPUT_MIME_TYPES.join(
                ', ',
              )}`,
              errorKey: 'INVALID_FILE_TYPE',
            },
          ],
        }),
      );
    }
  }

  @Get()
  async getAll(): Promise<ViewerButtonOutputDto[]> {
    this.logger.log('Execute: get all viewer buttons', this.getAll.name);
    const entities = await this.viewerButtonRepository.findAll();
    return entities.map(entity => ViewerButtonOutputDto.fromEntity(entity));
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'hoverVideoFile', maxCount: 1 }], { storage: storageUtil }),
  )
  async create(
    @Body() body: CreateViewerButtonInputDto,
    @UploadedFiles() files: ViewerButtonUploadFiles,
  ): Promise<ViewerButtonOutputDto> {
    this.logger.log('Execute: create viewer button', this.create.name);

    const hoverVideoFile = this.pickFile(files, 'hoverVideoFile');

    if (!hoverVideoFile) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: 'hoverVideoFile',
              message: 'Hover video file is required',
              errorKey: 'FILE_REQUIRED',
            },
          ],
        }),
      );
    }
    this.validateUploadFiles({ hoverVideoFile });

    const totalButtons = await this.viewerButtonRepository.getCount();
    if (totalButtons >= MAX_VIEWER_BUTTONS) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: 'viewerButtons',
              message: `Maximum ${MAX_VIEWER_BUTTONS} ALL buttons allowed`,
              errorKey: 'MAX_VIEWER_BUTTONS_LIMIT',
            },
          ],
        }),
      );
    }

    const existingByCategory = await this.viewerButtonRepository.findByCategory(body.category);
    if (existingByCategory) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: 'category',
              message: `ALL button for category "${body.category}" already exists`,
              errorKey: 'VIEWER_BUTTON_CATEGORY_CONFLICT',
            },
          ],
        }),
      );
    }

    const sortOrder = body.sortOrder ?? (await this.viewerButtonRepository.getMaxSortOrder()) + 1;
    const entity = ViewerButton.create(
      body.category,
      '',
      null,
      body.linkUrl ?? null,
      sortOrder,
      body.openInNewTab ?? true,
    );
    const savedEntity = await this.viewerButtonRepository.save(entity);

    const hoverVideoUrl = await this.moviesService.getBackgroundContentUrl(
      hoverVideoFile!,
      savedEntity.id,
      MovieTypesEnum.BANNER,
      VIEWER_BUTTONS_S3_PREFIX,
    );

    if (!hoverVideoUrl) {
      await this.viewerButtonRepository.remove(savedEntity);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    savedEntity.update(
      body.category,
      undefined,
      hoverVideoUrl,
      body.linkUrl ?? null,
      sortOrder,
      body.openInNewTab ?? true,
    );
    await this.viewerButtonRepository.save(savedEntity);

    return ViewerButtonOutputDto.fromEntity(savedEntity);
  }

  @HttpCode(HttpStatus.OK)
  @Put(':buttonId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'hoverVideoFile', maxCount: 1 }], { storage: storageUtil }),
  )
  async update(
    @Param('buttonId', ParseIntPatchPipe) buttonId: number,
    @Body() body: UpdateViewerButtonInputDto,
    @UploadedFiles() files?: ViewerButtonUploadFiles,
  ): Promise<ViewerButtonOutputDto> {
    this.logger.log(`Execute: update viewer button ${buttonId}`, this.update.name);

    const hoverVideoFile = this.pickFile(files, 'hoverVideoFile');
    this.validateUploadFiles({ hoverVideoFile });

    const entity = await this.viewerButtonRepository.findById(buttonId);
    if (!entity) {
      this.appNotification.handleHttpResult(
        this.appNotification.notFound({
          field: 'buttonId',
          message: 'Viewer button not found',
          errorKey: 'VIEWER_BUTTON_NOT_FOUND',
        }),
      );
    }

    let newHoverVideoUrl: string | undefined;

    if (hoverVideoFile) {
      const url = await this.moviesService.getBackgroundContentUrl(
        hoverVideoFile,
        entity!.id,
        MovieTypesEnum.BANNER,
        VIEWER_BUTTONS_S3_PREFIX,
      );
      if (url) newHoverVideoUrl = url;
      else this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    const nextCategory: ViewerButtonCategory | undefined = body.category;
    if (nextCategory && nextCategory !== entity!.category) {
      const existingByCategory = await this.viewerButtonRepository.findByCategory(nextCategory);
      if (existingByCategory && existingByCategory.id !== entity!.id) {
        this.appNotification.handleHttpResult(
          this.appNotification.badRequest({
            errorsMessages: [
              {
                field: 'category',
                message: `ALL button for category "${nextCategory}" already exists`,
                errorKey: 'VIEWER_BUTTON_CATEGORY_CONFLICT',
              },
            ],
          }),
        );
      }
    }

    entity!.update(
      nextCategory,
      undefined,
      newHoverVideoUrl,
      body.linkUrl,
      body.sortOrder,
      body.openInNewTab,
    );

    if (body.isActive !== undefined) {
      entity!.toggleActive(body.isActive);
    }

    await this.viewerButtonRepository.save(entity!);
    return ViewerButtonOutputDto.fromEntity(entity!);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':buttonId')
  async remove(@Param('buttonId', ParseIntPatchPipe) buttonId: number): Promise<void> {
    this.logger.log(`Execute: remove viewer button ${buttonId}`, this.remove.name);

    const entity = await this.viewerButtonRepository.findById(buttonId);
    if (!entity) {
      this.appNotification.handleHttpResult(
        this.appNotification.notFound({
          field: 'buttonId',
          message: 'Viewer button not found',
          errorKey: 'VIEWER_BUTTON_NOT_FOUND',
        }),
      );
    }

    await this.viewerButtonRepository.remove(entity!);
  }
}

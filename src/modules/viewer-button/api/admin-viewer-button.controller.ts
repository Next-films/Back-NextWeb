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
import { ViewerButton } from '@/viewer-button/domain/viewer-button.entity';
import { ViewerButtonRepository } from '@/viewer-button/infrastructure/viewer-button.repository';

type ViewerButtonUploadFiles = {
  imageFile?: Express.Multer.File[];
  hoverVideoFile?: Express.Multer.File[];
};

const IMAGE_UPLOAD_INPUT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
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
const MAX_VIEWER_BUTTONS = 4;

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

  private validateUploadFiles(files: {
    imageFile?: Express.Multer.File;
    hoverVideoFile?: Express.Multer.File;
  }): void {
    const { imageFile, hoverVideoFile } = files;

    if (
      imageFile &&
      (!imageFile.mimetype || !IMAGE_UPLOAD_INPUT_MIME_TYPES.includes(imageFile.mimetype))
    ) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: imageFile.fieldname || 'imageFile',
              message: `Invalid image mime type. Allowed: ${IMAGE_UPLOAD_INPUT_MIME_TYPES.join(
                ', ',
              )}`,
              errorKey: 'INVALID_FILE_TYPE',
            },
          ],
        }),
      );
    }

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
    FileFieldsInterceptor(
      [
        { name: 'imageFile', maxCount: 1 },
        { name: 'hoverVideoFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  async create(
    @Body() body: CreateViewerButtonInputDto,
    @UploadedFiles() files: ViewerButtonUploadFiles,
  ): Promise<ViewerButtonOutputDto> {
    this.logger.log('Execute: create viewer button', this.create.name);

    const imageFile = this.pickFile(files, 'imageFile');
    const hoverVideoFile = this.pickFile(files, 'hoverVideoFile');

    if (!imageFile) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            { field: 'imageFile', message: 'Image file is required', errorKey: 'FILE_REQUIRED' },
          ],
        }),
      );
    }

    this.validateUploadFiles({ imageFile, hoverVideoFile });

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

    const sortOrder = body.sortOrder ?? (await this.viewerButtonRepository.getMaxSortOrder()) + 1;
    const entity = ViewerButton.create(
      '',
      null,
      body.linkUrl ?? null,
      sortOrder,
      body.openInNewTab ?? true,
    );
    const savedEntity = await this.viewerButtonRepository.save(entity);

    const [imageUrl, hoverVideoUrl] = await Promise.all([
      this.moviesService.getBackgroundContentUrl(
        imageFile!,
        savedEntity.id,
        MovieTypesEnum.BANNER,
        VIEWER_BUTTONS_S3_PREFIX,
      ),
      hoverVideoFile
        ? this.moviesService.getBackgroundContentUrl(
            hoverVideoFile,
            savedEntity.id,
            MovieTypesEnum.BANNER,
            VIEWER_BUTTONS_S3_PREFIX,
          )
        : Promise.resolve(null),
    ]);

    if (!imageUrl) {
      await this.viewerButtonRepository.remove(savedEntity);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    if (hoverVideoFile && !hoverVideoUrl) {
      await this.viewerButtonRepository.remove(savedEntity);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    savedEntity.update(
      imageUrl ?? undefined,
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
    FileFieldsInterceptor(
      [
        { name: 'imageFile', maxCount: 1 },
        { name: 'hoverVideoFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  async update(
    @Param('buttonId', ParseIntPatchPipe) buttonId: number,
    @Body() body: UpdateViewerButtonInputDto,
    @UploadedFiles() files?: ViewerButtonUploadFiles,
  ): Promise<ViewerButtonOutputDto> {
    this.logger.log(`Execute: update viewer button ${buttonId}`, this.update.name);

    const imageFile = this.pickFile(files, 'imageFile');
    const hoverVideoFile = this.pickFile(files, 'hoverVideoFile');
    this.validateUploadFiles({ imageFile, hoverVideoFile });

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

    let newImageUrl: string | undefined;
    let newHoverVideoUrl: string | undefined;

    if (imageFile) {
      const url = await this.moviesService.getBackgroundContentUrl(
        imageFile,
        entity!.id,
        MovieTypesEnum.BANNER,
        VIEWER_BUTTONS_S3_PREFIX,
      );
      if (url) newImageUrl = url;
      else this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

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

    entity!.update(newImageUrl, newHoverVideoUrl, body.linkUrl, body.sortOrder, body.openInNewTab);

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

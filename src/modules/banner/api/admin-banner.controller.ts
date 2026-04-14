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
import { ADMIN_BANNER_ROUTE } from '@/common/constants/route.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { BannerRepository } from '@/banner/infrastructure/banner.repository';
import { Banner } from '@/banner/domain/banner.entity';
import { BannerOutputDto } from '@/banner/api/dtos/output/banner.output.dto';
import { CreateBannerInputDto } from '@/banner/api/dtos/input/create-banner.input.dto';
import { UpdateBannerInputDto } from '@/banner/api/dtos/input/update-banner.input.dto';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { MoviesService } from '@/movies/application/movies.service';
import { MovieTypesEnum } from '@/common/types/types';
import { ApplicationNotification } from '@/common/utils/app-notification.util';
import { storageUtil } from '@/common/utils/storage-big-files.util';

type BannerUploadFiles = {
  imageFile?: Express.Multer.File[];
  buttonImageFile?: Express.Multer.File[];
  buttonHoverVideoFile?: Express.Multer.File[];
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
const BANNER_BUTTONS_S3_PREFIX = 'banner-buttons';

@ApiTags('Admin - banners. Manage homepage slider banners.')
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(ADMIN_BANNER_ROUTE.MAIN)
export class AdminBannerController {
  constructor(
    private readonly logger: LoggerService,
    private readonly bannerRepository: BannerRepository,
    private readonly moviesService: MoviesService,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminBannerController.name);
  }

  private pickFile(files: BannerUploadFiles | undefined, field: keyof BannerUploadFiles) {
    return files?.[field]?.[0];
  }

  private validateUploadFiles(files: {
    imageFile?: Express.Multer.File;
    buttonImageFile?: Express.Multer.File;
    buttonHoverVideoFile?: Express.Multer.File;
  }): void {
    const { imageFile, buttonImageFile, buttonHoverVideoFile } = files;

    const imageCandidates = [imageFile, buttonImageFile].filter(Boolean) as Express.Multer.File[];
    const invalidImageFile = imageCandidates.find(
      file => !file.mimetype || !IMAGE_UPLOAD_INPUT_MIME_TYPES.includes(file.mimetype),
    );
    if (invalidImageFile) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: invalidImageFile.fieldname || 'imageFile',
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
      buttonHoverVideoFile &&
      (!buttonHoverVideoFile.mimetype ||
        !VIDEO_UPLOAD_INPUT_MIME_TYPES.includes(buttonHoverVideoFile.mimetype))
    ) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            {
              field: 'buttonHoverVideoFile',
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
  async getAllBanners(): Promise<BannerOutputDto[]> {
    this.logger.log('Execute: get all banners', this.getAllBanners.name);
    const banners = await this.bannerRepository.findAll();
    return banners.map(banner => BannerOutputDto.fromEntity(banner));
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imageFile', maxCount: 1 },
        { name: 'buttonImageFile', maxCount: 1 },
        { name: 'buttonHoverVideoFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  async createBanner(
    @Body() body: CreateBannerInputDto,
    @UploadedFiles() files: BannerUploadFiles,
  ): Promise<BannerOutputDto> {
    this.logger.log('Execute: create banner', this.createBanner.name);

    const imageFile = this.pickFile(files, 'imageFile');
    const buttonImageFile = this.pickFile(files, 'buttonImageFile');
    const buttonHoverVideoFile = this.pickFile(files, 'buttonHoverVideoFile');

    if (!imageFile) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            { field: 'imageFile', message: 'Image file is required', errorKey: 'FILE_REQUIRED' },
          ],
        }),
      );
    }

    this.validateUploadFiles({ imageFile, buttonImageFile, buttonHoverVideoFile });

    const sortOrder = body.sortOrder ?? (await this.bannerRepository.getMaxSortOrder()) + 1;
    const banner = Banner.create('', body.linkUrl ?? null, sortOrder, body.openInNewTab ?? true);
    const savedBanner = await this.bannerRepository.save(banner);

    const [imageUrl, buttonImageUrl, buttonHoverVideoUrl] = await Promise.all([
      this.moviesService.getPosterUrl(imageFile!, savedBanner.id, MovieTypesEnum.BANNER),
      buttonImageFile
        ? this.moviesService.getBackgroundContentUrl(
            buttonImageFile,
            savedBanner.id,
            MovieTypesEnum.BANNER,
            BANNER_BUTTONS_S3_PREFIX,
          )
        : Promise.resolve(null),
      buttonHoverVideoFile
        ? this.moviesService.getBackgroundContentUrl(
            buttonHoverVideoFile,
            savedBanner.id,
            MovieTypesEnum.BANNER,
            BANNER_BUTTONS_S3_PREFIX,
          )
        : Promise.resolve(null),
    ]);

    if (!imageUrl) {
      await this.bannerRepository.remove(savedBanner);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    if (buttonImageFile && !buttonImageUrl) {
      await this.bannerRepository.remove(savedBanner);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    if (buttonHoverVideoFile && !buttonHoverVideoUrl) {
      await this.bannerRepository.remove(savedBanner);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    savedBanner.update(
      imageUrl ?? undefined,
      body.linkUrl ?? null,
      sortOrder,
      body.openInNewTab ?? true,
      buttonImageUrl,
      buttonHoverVideoUrl,
    );
    await this.bannerRepository.save(savedBanner);

    return BannerOutputDto.fromEntity(savedBanner);
  }

  @HttpCode(HttpStatus.OK)
  @Put(':bannerId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'imageFile', maxCount: 1 },
        { name: 'buttonImageFile', maxCount: 1 },
        { name: 'buttonHoverVideoFile', maxCount: 1 },
      ],
      { storage: storageUtil },
    ),
  )
  async updateBanner(
    @Param('bannerId', ParseIntPatchPipe) bannerId: number,
    @Body() body: UpdateBannerInputDto,
    @UploadedFiles() files?: BannerUploadFiles,
  ): Promise<BannerOutputDto> {
    this.logger.log(`Execute: update banner ${bannerId}`, this.updateBanner.name);

    const imageFile = this.pickFile(files, 'imageFile');
    const buttonImageFile = this.pickFile(files, 'buttonImageFile');
    const buttonHoverVideoFile = this.pickFile(files, 'buttonHoverVideoFile');
    this.validateUploadFiles({ imageFile, buttonImageFile, buttonHoverVideoFile });

    const banner = await this.bannerRepository.findById(bannerId);
    if (!banner) {
      this.appNotification.handleHttpResult(
        this.appNotification.notFound({
          field: 'bannerId',
          message: 'Banner not found',
          errorKey: 'BANNER_NOT_FOUND',
        }),
      );
    }

    let newImageUrl: string | undefined;
    let newButtonImageUrl: string | undefined;
    let newButtonHoverVideoUrl: string | undefined;
    if (imageFile) {
      const url = await this.moviesService.getPosterUrl(
        imageFile,
        banner!.id,
        MovieTypesEnum.BANNER,
      );
      if (url) newImageUrl = url;
    }

    if (buttonImageFile) {
      const url = await this.moviesService.getBackgroundContentUrl(
        buttonImageFile,
        banner!.id,
        MovieTypesEnum.BANNER,
        BANNER_BUTTONS_S3_PREFIX,
      );
      if (url) newButtonImageUrl = url;
      else this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    if (buttonHoverVideoFile) {
      const url = await this.moviesService.getBackgroundContentUrl(
        buttonHoverVideoFile,
        banner!.id,
        MovieTypesEnum.BANNER,
        BANNER_BUTTONS_S3_PREFIX,
      );
      if (url) newButtonHoverVideoUrl = url;
      else this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    banner!.update(
      newImageUrl,
      body.linkUrl,
      body.sortOrder,
      body.openInNewTab,
      newButtonImageUrl,
      newButtonHoverVideoUrl,
    );

    if (body.isActive !== undefined) {
      banner!.toggleActive(body.isActive);
    }

    await this.bannerRepository.save(banner!);
    return BannerOutputDto.fromEntity(banner!);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':bannerId')
  async removeBanner(@Param('bannerId', ParseIntPatchPipe) bannerId: number): Promise<void> {
    this.logger.log(`Execute: remove banner ${bannerId}`, this.removeBanner.name);

    const banner = await this.bannerRepository.findById(bannerId);
    if (!banner) {
      this.appNotification.handleHttpResult(
        this.appNotification.notFound({
          field: 'bannerId',
          message: 'Banner not found',
          errorKey: 'BANNER_NOT_FOUND',
        }),
      );
    }

    await this.bannerRepository.remove(banner!);
  }
}

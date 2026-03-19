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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get()
  async getAllBanners(): Promise<BannerOutputDto[]> {
    this.logger.log('Execute: get all banners', this.getAllBanners.name);
    const banners = await this.bannerRepository.findAll();
    return banners.map(banner => BannerOutputDto.fromEntity(banner));
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imageFile', { storage: storageUtil }))
  async createBanner(
    @Body() body: CreateBannerInputDto,
    @UploadedFile() imageFile: Express.Multer.File,
  ): Promise<BannerOutputDto> {
    this.logger.log('Execute: create banner', this.createBanner.name);

    if (!imageFile) {
      this.appNotification.handleHttpResult(
        this.appNotification.badRequest({
          errorsMessages: [
            { field: 'imageFile', message: 'Image file is required', errorKey: 'FILE_REQUIRED' },
          ],
        }),
      );
    }

    const sortOrder = body.sortOrder ?? (await this.bannerRepository.getMaxSortOrder()) + 1;
    const banner = Banner.create('', body.linkUrl ?? null, sortOrder, body.openInNewTab ?? true);
    const savedBanner = await this.bannerRepository.save(banner);

    const imageUrl = await this.moviesService.getPosterUrl(
      imageFile,
      savedBanner.id,
      MovieTypesEnum.BANNER,
    );

    if (!imageUrl) {
      await this.bannerRepository.remove(savedBanner);
      this.appNotification.handleHttpResult(this.appNotification.internalServerError());
    }

    savedBanner.update(imageUrl!);
    await this.bannerRepository.save(savedBanner);

    return BannerOutputDto.fromEntity(savedBanner);
  }

  @HttpCode(HttpStatus.OK)
  @Put(':bannerId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imageFile', { storage: storageUtil }))
  async updateBanner(
    @Param('bannerId', ParseIntPatchPipe) bannerId: number,
    @Body() body: UpdateBannerInputDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ): Promise<BannerOutputDto> {
    this.logger.log(`Execute: update banner ${bannerId}`, this.updateBanner.name);

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
    if (imageFile) {
      const url = await this.moviesService.getPosterUrl(
        imageFile,
        banner!.id,
        MovieTypesEnum.BANNER,
      );
      if (url) newImageUrl = url;
    }

    banner!.update(newImageUrl, body.linkUrl, body.sortOrder, body.openInNewTab);

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

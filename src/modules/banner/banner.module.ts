import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from '@/banner/domain/banner.entity';
import { BannerRepository } from '@/banner/infrastructure/banner.repository';
import { PublicBannerController } from '@/banner/api/public-banner.controller';
import { AdminBannerController } from '@/banner/api/admin-banner.controller';
import { MoviesModules } from '@/movies/movies.modules';

@Module({
  imports: [TypeOrmModule.forFeature([Banner]), MoviesModules],
  controllers: [PublicBannerController, AdminBannerController],
  providers: [BannerRepository],
  exports: [BannerRepository],
})
export class BannerModule {}

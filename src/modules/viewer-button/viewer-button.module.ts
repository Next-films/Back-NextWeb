import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesModules } from '@/movies/movies.modules';
import { AdminViewerButtonController } from '@/viewer-button/api/admin-viewer-button.controller';
import { PublicViewerButtonController } from '@/viewer-button/api/public-viewer-button.controller';
import { ViewerButton } from '@/viewer-button/domain/viewer-button.entity';
import { ViewerButtonRepository } from '@/viewer-button/infrastructure/viewer-button.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ViewerButton]), MoviesModules],
  controllers: [PublicViewerButtonController, AdminViewerButtonController],
  providers: [ViewerButtonRepository],
  exports: [ViewerButtonRepository],
})
export class ViewerButtonModule {}

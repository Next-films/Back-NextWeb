import { Module } from '@nestjs/common';
import { AdminGenreController } from '@/admin/api/admin-genre.controller';
import { AdminGenreCreateCommandHandler } from '@/admin/application/handlers/admin-genre-create.handler';
import { MoviesModules } from '@/movies/movies.modules';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { GenerateAdminMigration } from '@/data-migrations/generate-admin.migration';
import { BcryptModule } from '@/bcrypt-module/bcrypt.module';

export const AdminProvider = {
  provide: 'Admin',
  useValue: Admin,
};

const providers = [AdminProvider];

const handlers = [AdminGenreCreateCommandHandler];

const exportProviders = [TypeOrmModule.forFeature([Admin]), AdminProvider];

@Module({
  imports: [MoviesModules, TypeOrmModule.forFeature([Admin]), BcryptModule],
  controllers: [AdminGenreController],
  providers: [...handlers, GenerateAdminMigration, ...providers],
  exports: [...exportProviders],
})
export class AdminModule {}

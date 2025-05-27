import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenresController } from './api/genres.controller';
import { GenresService } from './genres.service';
import { GenreEntity } from './domain/genre.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GenreEntity])],
    controllers: [GenresController],
    providers: [GenresService],
    exports: [GenresService]
})
export class GenresModule {}

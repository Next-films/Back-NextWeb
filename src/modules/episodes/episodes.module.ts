import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpisodeEntity } from './domain/episode.entity';
import { EpisodesService } from './episodes.service';
import { EpisodesController } from './api/episodes.controller';

@Module({
    imports: [TypeOrmModule.forFeature([EpisodeEntity])],
    providers: [EpisodesService],
    controllers: [EpisodesController],
    exports: [EpisodesService],
})
export class EpisodesModule {}

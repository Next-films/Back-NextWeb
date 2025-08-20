import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationFilmQueryRepository } from '@/moderation-movie/infrastructure/moderation-film.query-repository';
import { ModerationCartoonQueryRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.query-repository';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';
import { FinishedTorrentModerationRepository } from '@/moderation-movie/infrastructure/finished-torrent-moderation.repository';

export const moderationFilmEntityProvider = {
  provide: 'ModerationFilmEntity',
  useValue: ModerationFilmEntity,
};

export const moderationCartoonEntityProvider = {
  provide: 'ModerationCartoonEntity',
  useValue: ModerationCartoonEntity,
};

export const finishedTorrentModerationEntityProvider = {
  provide: 'FinishedTorrentModerationEntity',
  useValue: FinishedTorrentModerationEntity,
};

const providers = [
  moderationFilmEntityProvider,
  moderationCartoonEntityProvider,
  finishedTorrentModerationEntityProvider,
];

const exportsProviders = [
  ModerationCartoonRepository,
  ModerationFilmRepository,
  ModerationFilmQueryRepository,
  ModerationCartoonQueryRepository,
  moderationFilmEntityProvider,
  moderationCartoonEntityProvider,
  finishedTorrentModerationEntityProvider,
  FinishedTorrentModerationRepository,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModerationFilmEntity,
      ModerationCartoonEntity,
      FinishedTorrentModerationEntity,
    ]),
  ],
  controllers: [],
  providers: [
    ...providers,
    ModerationFilmRepository,
    ModerationCartoonRepository,
    ModerationFilmQueryRepository,
    ModerationCartoonQueryRepository,
    FinishedTorrentModerationRepository,
  ],
  exports: [...exportsProviders],
})
export class ModerationMovieModule {}

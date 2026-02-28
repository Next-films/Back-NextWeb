import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicSerialController } from '@/serials/api/serial.controller';
import { SerialsBridgeRmqController } from '@/serials/api/bridge-rpc-serial.controller';
import { SerialPrivateController } from '@/serials/api/private-serial.controller';
import { SerialPrivateRpcController } from '@/serials/api/private-serial-rpc.controller';

import { SerialPublicQueryRepository } from '@/serials/infrastructure/serial-public.query-repository';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

import { SerialsOutputDtoMapper } from '@/serials/api/dtos/output/serials.output.dto';
import { SerialEpisodesOutputDtoMapper } from '@/serials/api/dtos/output/serial-episode.output.dto';
import { SerialsPrivateOutputDtoMapper } from '@/serials/api/dtos/output/serials-private.output.dto';
import { SerialsRpcOutputDtoMapper } from '@/serials/api/dtos/output/serials-rpc.output.dto';

import { GetSerialByIdQueryHandler } from '@/serials/application/query-handlers/get-serial-by-id.query-handler';
import { GetSerialsQueryHandler } from '@/serials/application/query-handlers/get-serials.query-handler';
import { GetSerialEpisodeByIdQueryHandler } from '@/serials/application/query-handlers/get-serial-episode-by-id.query-handler';
import { GetPrivateSerialByKinopoiskIdQueryHandler } from '@/serials/application/query-handlers/get-private-serial-by-kinopoisk-id.query-handler';
import { GetRpcSerialByKinopoiskIdQueryHandler } from '@/serials/application/query-handlers/get-rpc-serial-by-kinopoisk-id.query-handler';

import { NewSerialNotificationCommandHandler } from '@/serials/application/handlers/new-serial-notification.handler';
import { NewSerialIsHandleNotificationCommandHandler } from '@/serials/application/handlers/new-serial-is-handle-notification.handler';
import { NewBackGroundContentSerialCommandHandler } from '@/serials/application/handlers/new-background-content-serial.handler';
import { MoviesModules } from '@/movies/movies.modules';
import { KinopoiskModule } from '@/external-api/kinopoisk/kinopoisk.module';
import { ModerationMovieModule } from '@/moderation-movie/moderation-movie.module';

const queryHandlers = [
  GetSerialByIdQueryHandler,
  GetSerialsQueryHandler,
  GetSerialEpisodeByIdQueryHandler,
  GetPrivateSerialByKinopoiskIdQueryHandler,
  GetRpcSerialByKinopoiskIdQueryHandler,
];

const handlers = [
  NewSerialNotificationCommandHandler,
  NewSerialIsHandleNotificationCommandHandler,
  NewBackGroundContentSerialCommandHandler,
];

const serialProvider = {
  provide: 'Serial',
  useValue: Serial,
};

@Module({
  imports: [
    TypeOrmModule.forFeature([Serial, SerialEpisode, SerialSeason]),
    MoviesModules,
    KinopoiskModule,
    ModerationMovieModule,
  ],
  controllers: [
    PublicSerialController,
    SerialsBridgeRmqController,
    SerialPrivateController,
    SerialPrivateRpcController,
  ],
  providers: [
    SerialPublicQueryRepository,
    SerialQueryRepository,
    SerialRepository,
    SerialsOutputDtoMapper,
    SerialEpisodesOutputDtoMapper,
    SerialsPrivateOutputDtoMapper,
    SerialsRpcOutputDtoMapper,
    ...queryHandlers,
    ...handlers,
    serialProvider,
  ],
  exports: [SerialRepository, SerialQueryRepository, serialProvider],
})
export class SerialModule {}

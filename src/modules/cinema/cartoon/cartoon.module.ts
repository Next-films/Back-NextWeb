import { Module } from '@nestjs/common';
import { PublicCartoonController } from '@/cartoons/api/public-cartoon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import { GetPublicCartoonByIdQueryHandler } from '@/cartoons/application/query-handlers/get-public-cartoon-by-id.query-handler';
import { GetPublicCartoonsQueryHandler } from '@/cartoons/application/query-handlers/get-public-cartoons.query-handler';
import { CartoonPrivateRpcController } from '@/cartoons/api/private-cartoon-rpc.controller';
import { GetPrivateCartoonByKinopoiskIdQueryHandler } from '@/cartoons/application/query-handlers/get-private-cartoon-by-kinopoisk-id.query-handler';
import { CartoonPrivateController } from '@/cartoons/api/private-cartoon.controller';
import { NewCartoonNotificationCommandHandler } from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { MoviesModules } from '@/movies/movies.modules';
import { KinopoiskModule } from '@/external-api/kinopoisk/kinopoisk.module';
import { CartoonBridgeRmqController } from '@/cartoons/api/bridge-rpc-cartoon.controller';
import { NewCartoonIsHandleNotificationCommandHandler } from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { NewBackGroundContentCartoonCommandHandler } from '@/cartoons/application/handlers/new-background-content-cartoon.handler';
import { CartoonsRpcOutputDtoMapper } from '@/cartoons/api/dtos/output/cartoons-rpc.output.dto';
import { GetRpcCartoonsByKinopoiskIdQueryHandler } from '@/cartoons/application/query-handlers/get-rpc-cartoons-by-kinopoisk-id.query-handler';
import { CartoonsPublicOutputDtoMapper } from '@/cartoons/api/dtos/output/cartoons-public.output.dto';
import { CartoonsPrivateOutputDtoMapper } from '@/cartoons/api/dtos/output/cartoons-private.output.dto';
import { CartoonPublicQueryRepository } from '@/cartoons/infrastructure/cartoon-public.query-repository';
import { ModerationMovieModule } from '@/moderation-movie/moderation-movie.module';
import { UpsertUpcomingCartoonCommandHandler } from '@/cartoons/application/handlers/upsert-upcoming-cartoon.handler';

const cartoonProvider = {
  provide: 'Cartoon',
  useValue: Cartoon,
};

const providers = [cartoonProvider];

const queryHandlers = [
  GetPublicCartoonByIdQueryHandler,
  GetPublicCartoonsQueryHandler,
  GetPrivateCartoonByKinopoiskIdQueryHandler,
  GetRpcCartoonsByKinopoiskIdQueryHandler,
];

const handlers = [
  NewCartoonNotificationCommandHandler,
  NewCartoonIsHandleNotificationCommandHandler,
  NewBackGroundContentCartoonCommandHandler,
  UpsertUpcomingCartoonCommandHandler,
];

const exportProviders = [CartoonRepository, CartoonQueryRepository, cartoonProvider];

@Module({
  imports: [
    TypeOrmModule.forFeature([Cartoon]),
    MoviesModules,
    KinopoiskModule,
    ModerationMovieModule,
  ],
  controllers: [
    PublicCartoonController,
    CartoonPrivateRpcController,
    CartoonPrivateController,
    CartoonBridgeRmqController,
  ],
  providers: [
    CartoonQueryRepository,
    CartoonsPublicOutputDtoMapper,
    CartoonsPrivateOutputDtoMapper,
    CartoonsRpcOutputDtoMapper,
    CartoonPublicQueryRepository,
    ...queryHandlers,
    ...handlers,
    ...providers,
    CartoonRepository,
  ],
  exports: [...exportProviders],
})
export class CartoonModule {}

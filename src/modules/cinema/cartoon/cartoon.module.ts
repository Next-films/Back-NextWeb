import { Module } from '@nestjs/common';
import { CartoonController } from '@/cartoons/api/cartoon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonQueryRepository } from '@/cartoons/infrastructure/cartoon.query-repository';
import { CartoonsOutputDtoMapper } from '@/cartoons/api/dtos/output/cartoons.output.dto';
import { GetCartoonByIdQueryHandler } from '@/cartoons/application/query-handlers/get-cartoon-by-id.query-handler';
import { GetCartoonsQueryHandler } from '@/cartoons/application/query-handlers/get-cartoons.query-handler';
import { CartoonPrivateRpcController } from '@/cartoons/api/private-cartoon-rpc.controller';
import { GetCartoonByKinopoiskIdQueryHandler } from '@/cartoons/application/query-handlers/get-cartoon-by-kinopoisk-id.query-handler';
import { CartoonPrivateController } from '@/cartoons/api/private-cartoon.controller';
import { NewCartoonNotificationCommandHandler } from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { MoviesModules } from '@/movies/movies.modules';
import { KinopoiskModule } from '@/external-api/kinopoisk/kinopoisk.module';
import { CartoonBridgeRmqController } from '@/cartoons/api/bridge-rpc-cartoon.controller';
import { NewCartoonIsHandleNotificationCommandHandler } from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { CartoonsRpcOutputDtoMapper } from '@/cartoons/api/dtos/output/cartoons-rpc.output.dto';
import { GetRpcCartoonsByKinopoiskIdQueryHandler } from '@/cartoons/application/query-handlers/get-rpc-cartoons-by-kinopoisk-id.query-handler';

const cartoonProvider = {
  provide: 'Cartoon',
  useValue: Cartoon,
};

const providers = [cartoonProvider];

const queryHandlers = [
  GetCartoonByIdQueryHandler,
  GetCartoonsQueryHandler,
  GetCartoonByKinopoiskIdQueryHandler,
  GetRpcCartoonsByKinopoiskIdQueryHandler,
];

const handlers = [
  NewCartoonNotificationCommandHandler,
  NewCartoonIsHandleNotificationCommandHandler,
];

@Module({
  imports: [TypeOrmModule.forFeature([Cartoon]), MoviesModules, KinopoiskModule],
  controllers: [
    CartoonController,
    CartoonPrivateRpcController,
    CartoonPrivateController,
    CartoonBridgeRmqController,
  ],
  providers: [
    CartoonQueryRepository,
    CartoonsOutputDtoMapper,
    CartoonsRpcOutputDtoMapper,
    ...queryHandlers,
    ...handlers,
    ...providers,
    CartoonRepository,
  ],
  exports: [],
})
export class CartoonModule {}

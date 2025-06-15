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

const queryHandlers = [
  GetCartoonByIdQueryHandler,
  GetCartoonsQueryHandler,
  GetCartoonByKinopoiskIdQueryHandler,
];

@Module({
  imports: [TypeOrmModule.forFeature([Cartoon])],
  controllers: [CartoonController, CartoonPrivateRpcController, CartoonPrivateController],
  providers: [CartoonQueryRepository, CartoonsOutputDtoMapper, ...queryHandlers],
  exports: [],
})
export class CartoonModule {}

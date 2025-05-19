import { Module } from '@nestjs/common';
import { SerialController } from '@/serials/api/serial.controller';
import { SerialQueryRepository } from '@/serials/infrastructure/serial.query-repository';
import { SerialsOutputDtoMapper } from '@/serials/api/dtos/output/serials.output.dto';
import { GetSerialByIdQueryHandler } from '@/serials/application/query-handlers/get-serial-by-id.query-handler';
import { GetSerialsQueryHandler } from '@/serials/application/query-handlers/get-serials.query-handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { SerialEpisodesOutputDtoMapper } from '@/serials/api/dtos/output/serial-episode.output.dto';
import { GetSerialEpisodeByIdQueryHandler } from '@/serials/application/query-handlers/get-serial-episode-by-id.query-handler';

const queryHandlers = [
  GetSerialByIdQueryHandler,
  GetSerialsQueryHandler,
  GetSerialEpisodeByIdQueryHandler,
];

@Module({
  imports: [TypeOrmModule.forFeature([Serial, SerialEpisode])],
  controllers: [SerialController],
  providers: [
    SerialQueryRepository,
    SerialsOutputDtoMapper,
    SerialEpisodesOutputDtoMapper,
    ...queryHandlers,
  ],
  exports: [],
})
export class SerialModule {}

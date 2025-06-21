import { Module } from '@nestjs/common';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { BanProviderMovieCommandHandler } from '@/banned-providers-movie/application/handlers/ban-provider-movie.handler';
import { BannedProvidersMovieRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannedProvidersMovieRpcController } from '@/banned-providers-movie/api/banned-providers-movie-rpc.controller';
import { GetBannedMovieByProviderRpcQueryHandler } from '@/banned-providers-movie/application/query-handlers/get-banned-movie-by-provider-rpc.query-handler';
import { BannedProvidersMovieQueryRepository } from '@/banned-providers-movie/infrastructure/banned-providers-movie.query-repository';
import { BannedMoviesByProviderRpcOutputDtpMapper } from '@/banned-providers-movie/api/dtos/output/banned-movies-by-provider-rpc.output.dto';

const banProviderMovieProvider = {
  provide: 'BannedProvidersMovie',
  useValue: BannedProvidersMovie,
};

const providers = [banProviderMovieProvider];

const handlers = [BanProviderMovieCommandHandler];

const queryHandlers = [GetBannedMovieByProviderRpcQueryHandler];

const exportProviders = [
  BannedProvidersMovieRepository,
  banProviderMovieProvider,
  BannedProvidersMovieQueryRepository,
];

@Module({
  imports: [TypeOrmModule.forFeature([BannedProvidersMovie])],
  controllers: [BannedProvidersMovieRpcController],
  providers: [
    ...providers,
    ...handlers,
    BannedProvidersMovieRepository,
    ...queryHandlers,
    BannedProvidersMovieQueryRepository,
    BannedMoviesByProviderRpcOutputDtpMapper,
  ],
  exports: [...exportProviders],
})
export class BandedProvidersMovieModule {}

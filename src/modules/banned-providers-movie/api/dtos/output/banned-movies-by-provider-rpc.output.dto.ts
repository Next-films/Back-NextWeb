import { Injectable } from '@nestjs/common';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { TorApiProvidersEnum } from '@/common/types/types';

export class BannedMoviesByProviderRpcOutputDto {
  id: number;
  providerId: string;
  provider: TorApiProvidersEnum;
  createdAt: Date;
}

@Injectable()
export class BannedMoviesByProviderRpcOutputDtpMapper {
  mapEntity(movie: BannedProvidersMovie): BannedMoviesByProviderRpcOutputDto {
    const { id, providerId, provider, createdAt } = movie;
    return {
      id,
      providerId,
      provider,
      createdAt,
    };
  }

  mapEntities(movies: BannedProvidersMovie[]): BannedMoviesByProviderRpcOutputDto[] {
    return movies.map(e => this.mapEntity(e));
  }
}

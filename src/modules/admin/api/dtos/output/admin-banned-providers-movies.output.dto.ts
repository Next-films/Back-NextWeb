import { ApiProperty } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { TorApiProvidersEnum } from '@/common/types/types';

export class AdminBannedProvidersMoviesOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: TorApiProvidersEnum })
  provider: TorApiProvidersEnum;

  @ApiProperty()
  providerId: string;

  @ApiProperty({ nullable: true })
  movieName: string | null;

  @ApiProperty()
  createdAt: Date;
}

@Injectable()
export class AdminBannedProvidersMoviesOutputDtoMapper {
  mapEntity(movie: BannedProvidersMovie): AdminBannedProvidersMoviesOutputDto {
    const { id, providerId, provider, createdAt, movieName } = movie;
    return {
      id,
      providerId,
      provider,
      createdAt,
      movieName,
    };
  }

  mapEntities(movies: BannedProvidersMovie[]): AdminBannedProvidersMoviesOutputDto[] {
    return movies.map(m => this.mapEntity(m));
  }
}

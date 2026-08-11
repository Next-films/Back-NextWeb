import { Injectable } from '@nestjs/common';

import { MovieTypesEnum } from '@/common/types/types';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { TmdbService } from '@/external-api/tmdb/application/tmdb.service';
import { MovieKpMetadata } from '@/movies/domain/types';

@Injectable()
export class ExternalMovieAssetsService {
  constructor(
    private readonly kinopoiskService: KinopoiskService,
    private readonly tmdbService: TmdbService,
  ) {}

  async enrichUpcomingMetadata(
    metadata: MovieKpMetadata,
    kpMovie: KinopoiskMovie,
    movieType: MovieTypesEnum,
  ): Promise<MovieKpMetadata> {
    const kinopoiskLandscapeUrls = kpMovie.id
      ? await this.kinopoiskService.getLandscapeImageUrlsByMovieId(kpMovie.id)
      : [];

    metadata.backdropUrls = this.uniqueUrls([
      metadata.backdropUrl,
      ...(metadata.backdropUrls || []),
      ...kinopoiskLandscapeUrls,
    ]);
    metadata.backdropUrl = metadata.backdropUrl || metadata.backdropUrls[0] || null;

    if (!this.shouldQueryFallbackProviders(metadata)) return metadata;

    const tmdbAssets = await this.tmdbService.getAssetCandidates({
      movieType,
      tmdbId: kpMovie.externalId?.tmdb || null,
      imdbId: kpMovie.externalId?.imdb || null,
      title: metadata.name || kpMovie.name || null,
      originalTitle: metadata.originalName || kpMovie.enName || kpMovie.alternativeName || null,
      year: kpMovie.year || null,
    });

    metadata.trailerUrl = metadata.trailerUrl || tmdbAssets.trailerUrl;

    return metadata;
  }

  private shouldQueryFallbackProviders(metadata: MovieKpMetadata): boolean {
    return !metadata.trailerUrl;
  }

  private uniqueUrls(urls: Array<string | null | undefined>): string[] {
    return urls
      .map(url => url?.trim())
      .filter((url): url is string => Boolean(url))
      .filter((url, index, allUrls) => allUrls.indexOf(url) === index);
  }
}

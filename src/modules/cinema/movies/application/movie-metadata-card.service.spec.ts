import { MovieMetadataCardService } from '@/movies/application/movie-metadata-card.service';
import { MovieKpMetadata } from '@/movies/domain/types';

describe('MovieMetadataCardService', () => {
  const service = new MovieMetadataCardService(null as never);

  const metadata = (countries: string[] | null): MovieKpMetadata => ({
    name: null,
    originalName: null,
    alternativeName: null,
    universe: null,
    studio: null,
    genres: null,
    countries,
    description: null,
    releaseDate: null,
    posterUrl: null,
    backdropUrl: null,
    titleUrl: null,
    trailerUrl: null,
  });

  it('allows upcoming cards for foreign movies', () => {
    expect(service.shouldPublishUpcomingCard(metadata(['США']))).toBe(true);
  });

  it('blocks upcoming cards for Russian or unknown origin', () => {
    expect(service.shouldPublishUpcomingCard(metadata(['Россия']))).toBe(false);
    expect(service.shouldPublishUpcomingCard(metadata(['США', 'Россия']))).toBe(false);
    expect(service.shouldPublishUpcomingCard(metadata(null))).toBe(false);
  });
});

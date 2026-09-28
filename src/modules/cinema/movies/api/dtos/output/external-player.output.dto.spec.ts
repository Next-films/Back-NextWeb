import { MovieAvailabilityStatus } from '@/movies/domain/types';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MoviePublicOutputDtoMapper } from '@/movies/api/dtos/output/movie-public.output.dto';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialsOutputDtoMapper } from '@/serials/api/dtos/output/serials.output.dto';

const createMovie = (kpId: string): MovieEntity =>
  ({
    id: 1,
    kpId,
    title: 'Test movie',
    videoUrl: null,
    releaseDate: null,
    description: null,
    backgroundContentUrl: null,
    previewUrl: null,
    trailerUrl: null,
    country: null,
    duration: 0,
    titleUrl: null,
    universe: null,
    studio: null,
    genres: [],
    availabilityStatus: MovieAvailabilityStatus.RELEASED_NO_VIDEO,
  }) as unknown as MovieEntity;

describe('Vibix external player mapping', () => {
  it('maps a numeric Kinopoisk ID for a movie', () => {
    const mapper = new MoviePublicOutputDtoMapper();
    const movie = createMovie(' 484488 ');
    const result = mapper.mapMovie(movie);

    expect(result.externalPlayer).toEqual({
      provider: 'vibix',
      lookupType: 'kp',
      lookupId: '484488',
      mediaType: 'movie',
    });
    expect(mapper.mapAllPublicMovie(movie).externalPlayer).toEqual(result.externalPlayer);
  });

  it('does not expose an invalid Kinopoisk ID', () => {
    const result = new MoviePublicOutputDtoMapper().mapMovie(createMovie('javascript:alert(1)'));

    expect(result.externalPlayer).toBeNull();
  });

  it('marks serials with the series media type', () => {
    const serial = {
      ...createMovie('326'),
      episodes: [],
      seasons: [],
    } as unknown as Serial;

    const result = new SerialsOutputDtoMapper().mapSpecifySerial(serial);

    expect(result.externalPlayer).toMatchObject({
      lookupId: '326',
      mediaType: 'series',
    });
    expect(new SerialsOutputDtoMapper().mapSerial(serial).externalPlayer).toEqual(
      result.externalPlayer,
    );
  });
});

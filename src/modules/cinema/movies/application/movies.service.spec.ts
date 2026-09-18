import { MoviesService } from '@/movies/application/movies.service';
import { MovieTypesEnum } from '@/common/types/types';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';

describe('MoviesService', () => {
  const service = new MoviesService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it('ignores unavailable Poiskkino embeds and uses a YouTube trailer', () => {
    const trailerUrl = service.getKinopoiskTrailerUrl({
      videos: {
        trailers: [
          {
            site: 'youtube',
            url: 'https://www.youtube.com/watch?v=fallback',
            type: 'TRAILER',
          },
          {
            site: 'kinopoisk',
            url: 'https://play.poiskkino.dev/embed/535341',
            type: 'TRAILER',
          },
        ],
      },
    } as never);

    expect(trailerUrl).toBe('https://www.youtube.com/watch?v=fallback');
  });

  it('uses YouTube when Kinopoisk has no supported player source', () => {
    const trailerUrl = service.getKinopoiskTrailerUrl({
      videos: {
        trailers: [
          {
            site: 'youtube',
            url: 'https://www.youtube.com/watch?v=fallback',
            type: 'TRAILER',
          },
        ],
      },
    } as never);

    expect(trailerUrl).toBe('https://www.youtube.com/watch?v=fallback');
  });

  it('does not expose unavailable Poiskkino embeds as playable trailers', () => {
    expect(
      service.isPlayablePremiereTrailer(
        'https://play.poiskkino.dev/embed/6a64d4a7e0be6ddbcf1111e3',
      ),
    ).toBe(false);
    expect(service.isPlayablePremiereTrailer('https://www.youtube.com/watch?v=fallback')).toBe(
      true,
    );
  });

  it('falls back to the next trailer source when the native player is unavailable', async () => {
    const getBackgroundContentUrl = jest
      .spyOn(service, 'getBackgroundContentUrl')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('https://cdn.example/background.webm');

    const result = await service.getBackgroundContentUrlFromSources(
      ['https://play.poiskkino.dev/embed/535341', 'https://www.youtube.com/watch?v=fallback'],
      42,
      MovieTypesEnum.FILM,
    );

    expect(result).toBe('https://cdn.example/background.webm');
    expect(getBackgroundContentUrl).toHaveBeenCalledTimes(2);
    getBackgroundContentUrl.mockRestore();
  });

  it('keeps playable movies without Russian description and processed trailer in moderation', () => {
    const movie = {
      title: '72 часа',
      description: 'Description',
      originalTitle: null,
      alternativeTitles: null,
      country: ['США'],
      releaseDate: '2026-07-24',
      trailerUrl: null,
      previewUrl: 'https://cdn.example/poster.webp',
      videoUrl: 'https://cdn.example/movie.mp4',
      duration: 8131,
      genres: [{}],
    };

    expect(service.isValidMovieForProduction(movie as never)).toBe(false);
  });

  it('publishes complete premieres without movie file and duration', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      videoUrl: null,
      duration: 0,
      title: 'Shrek 5',
      description: 'Описание фильма',
      country: ['США'],
      releaseDate: '2027-06-30',
      trailerUrl: 'https://cdn.example/preview-clip/film/42/trailer/trailer.mp4',
      previewUrl: 'https://cdn.example/shrek.webp',
      isHidden: true,
      handleStatus: MovieHandleStatus.MODERATE,
      showOrHiddeMovie: jest.fn(function (
        this: { isHidden: boolean; handleStatus: MovieHandleStatus },
        isHidden: boolean,
        status: MovieHandleStatus,
      ) {
        this.isHidden = isHidden;
        this.handleStatus = status;
      }),
    };

    service.setHandleProductionStatusForPremiere(movie as never);

    expect(movie.showOrHiddeMovie).toHaveBeenCalledWith(false, MovieHandleStatus.PRODUCTION);
    expect(movie.isHidden).toBe(false);
    expect(movie.handleStatus).toBe(MovieHandleStatus.PRODUCTION);
  });

  it('keeps incomplete premieres in moderation', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      videoUrl: null,
      title: 'Shrek 5',
      description: null,
      country: ['США'],
      releaseDate: '2027-06-30',
      trailerUrl: 'https://youtube.com/watch?v=test',
      previewUrl: 'https://cdn.example/shrek.webp',
      isHidden: true,
      handleStatus: MovieHandleStatus.MODERATE,
      showOrHiddeMovie: jest.fn(),
    };

    service.setHandleProductionStatusForPremiere(movie as never);

    expect(movie.showOrHiddeMovie).toHaveBeenCalledWith(true, MovieHandleStatus.MODERATE);
  });
});

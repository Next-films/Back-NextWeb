import { MoviesService } from '@/movies/application/movies.service';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';

describe('MoviesService', () => {
  const service = new MoviesService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it('publishes complete premieres without movie file and duration', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      videoUrl: null,
      duration: 0,
      title: 'Shrek 5',
      description: 'Description',
      country: ['США'],
      releaseDate: '2027-06-30',
      trailerUrl: 'https://youtube.com/watch?v=test',
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

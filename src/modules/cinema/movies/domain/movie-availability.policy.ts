import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';

type MovieAvailabilitySubject = {
  availabilityStatus: MovieAvailabilityStatus;
  releaseDate: string | null;
  videoUrl?: string | null;
  hasPlayableMedia?: boolean;
};

export class MovieAvailabilityPolicy {
  static readonly publicStatuses = [
    MovieAvailabilityStatus.UPCOMING,
    MovieAvailabilityStatus.RELEASED_NO_VIDEO,
    MovieAvailabilityStatus.AVAILABLE,
  ];

  static isPublicHandleStatus(status: MovieHandleStatus): boolean {
    return status === MovieHandleStatus.PRODUCTION;
  }

  static isPublicAvailabilityStatus(status: MovieAvailabilityStatus): boolean {
    return this.publicStatuses.includes(status);
  }

  static resolveStatus(movie: MovieAvailabilitySubject): MovieAvailabilityStatus {
    if (movie.availabilityStatus !== MovieAvailabilityStatus.AVAILABLE) {
      return movie.availabilityStatus;
    }

    if (this.hasPlayableMedia(movie)) return MovieAvailabilityStatus.AVAILABLE;

    if (this.isFutureReleaseDate(movie.releaseDate)) {
      return MovieAvailabilityStatus.UPCOMING;
    }

    return MovieAvailabilityStatus.RELEASED_NO_VIDEO;
  }

  static isPlayable(movie: MovieAvailabilitySubject): boolean {
    return (
      this.resolveStatus(movie) === MovieAvailabilityStatus.AVAILABLE &&
      this.hasPlayableMedia(movie)
    );
  }

  static getUnavailableReason(movie: MovieAvailabilitySubject): string | null {
    const status = this.resolveStatus(movie);

    if (status === MovieAvailabilityStatus.AVAILABLE && this.hasPlayableMedia(movie)) return null;
    if (status === MovieAvailabilityStatus.UPCOMING) return 'upcoming';
    return 'video_not_available';
  }

  private static hasPlayableMedia(movie: MovieAvailabilitySubject): boolean {
    return typeof movie.hasPlayableMedia === 'boolean'
      ? movie.hasPlayableMedia
      : Boolean(movie.videoUrl);
  }

  private static isFutureReleaseDate(releaseDate: string | null): boolean {
    if (!releaseDate) return false;

    const releaseTime = new Date(releaseDate).getTime();
    if (Number.isNaN(releaseTime)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return releaseTime > today.getTime();
  }
}

import { MovieAvailabilityPolicy } from '@/movies/domain/movie-availability.policy';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';

describe('MovieAvailabilityPolicy', () => {
  it('keeps explicit upcoming status even when media is missing', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.UPCOMING,
      releaseDate: '2030-01-01',
      videoUrl: null,
    };

    expect(MovieAvailabilityPolicy.resolveStatus(movie)).toBe(MovieAvailabilityStatus.UPCOMING);
    expect(MovieAvailabilityPolicy.isPlayable(movie)).toBe(false);
    expect(MovieAvailabilityPolicy.getUnavailableReason(movie)).toBe('upcoming');
  });

  it('marks available movie as playable only when media exists', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.AVAILABLE,
      releaseDate: '2020-01-01',
      videoUrl: 'films/example/720p.m3u8',
    };

    expect(MovieAvailabilityPolicy.resolveStatus(movie)).toBe(MovieAvailabilityStatus.AVAILABLE);
    expect(MovieAvailabilityPolicy.isPlayable(movie)).toBe(true);
    expect(MovieAvailabilityPolicy.getUnavailableReason(movie)).toBeNull();
  });

  it('downgrades available status to released_no_video when media is missing', () => {
    const movie = {
      availabilityStatus: MovieAvailabilityStatus.AVAILABLE,
      releaseDate: '2020-01-01',
      videoUrl: null,
    };

    expect(MovieAvailabilityPolicy.resolveStatus(movie)).toBe(
      MovieAvailabilityStatus.RELEASED_NO_VIDEO,
    );
    expect(MovieAvailabilityPolicy.isPlayable(movie)).toBe(false);
    expect(MovieAvailabilityPolicy.getUnavailableReason(movie)).toBe('video_not_available');
  });

  it('supports serials by explicit playable media flag', () => {
    const serial = {
      availabilityStatus: MovieAvailabilityStatus.AVAILABLE,
      releaseDate: '2020-01-01',
      hasPlayableMedia: true,
    };

    expect(MovieAvailabilityPolicy.resolveStatus(serial)).toBe(MovieAvailabilityStatus.AVAILABLE);
    expect(MovieAvailabilityPolicy.isPlayable(serial)).toBe(true);
  });

  it('keeps only production handle status publicly visible', () => {
    expect(MovieAvailabilityPolicy.isPublicHandleStatus(MovieHandleStatus.PRODUCTION)).toBe(true);
    expect(MovieAvailabilityPolicy.isPublicHandleStatus(MovieHandleStatus.MODERATE)).toBe(false);
    expect(MovieAvailabilityPolicy.isPublicHandleStatus(MovieHandleStatus.PROCESSING)).toBe(false);
  });
});

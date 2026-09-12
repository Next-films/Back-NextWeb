import { MovieTypesEnum } from '@/common/types/types';
import { buildMovieStorageKeys } from './movie-storage-keys.util';

describe('buildMovieStorageKeys', () => {
  it('includes every known generated media directory', () => {
    expect(buildMovieStorageKeys(MovieTypesEnum.FILM, 42, [])).toEqual([
      'preview-clip/film/42/preview_clip/background.webm',
      'preview-clip/film/42/trailer/trailer.mp4',
      'posters/film/42/poster.webp',
      'logo/film/42/logo.webp',
    ]);
  });

  it('keeps local media keys and ignores external URLs', () => {
    expect(
      buildMovieStorageKeys(MovieTypesEnum.SERIAL, 7, [
        'https://request.next-films.ru/next-films/serials/source_7/episode-1/master.m3u8',
        'https://request.next-films.ru/next-films/preview-clip/serial/7/trailer/trailer.mp4',
        'https://youtube.com/watch?v=test',
      ]),
    ).toEqual([
      'serials/source_7/episode-1/master.m3u8',
      'preview-clip/serial/7/trailer/trailer.mp4',
      'preview-clip/serial/7/preview_clip/background.webm',
      'posters/serial/7/poster.webp',
      'logo/serial/7/logo.webp',
    ]);
  });
});

import { AdminReprocessPremiereAssetsCommandHandler } from '@/admin/application/handlers/admin-reprocess-premiere-assets.handler';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieKpMetadata } from '@/movies/domain/types';

describe('AdminReprocessPremiereAssetsCommandHandler', () => {
  const handler = new AdminReprocessPremiereAssetsCommandHandler(
    { setContext: jest.fn() } as never,
    null as never,
    null as never,
    {
      hasRussianText: (value: string | null) => Boolean(value && /[А-Яа-яЁё]/.test(value)),
    } as never,
    null as never,
    null as never,
  );
  const mergeMetadata = (
    movie: MovieEntity,
    metadata: MovieKpMetadata,
    onlyMissingMetadata: boolean,
  ) => {
    const subject = handler as unknown as {
      mergeLibraryMetadata: (
        target: MovieEntity,
        source: MovieKpMetadata,
        onlyMissing: boolean,
      ) => void;
    };
    subject.mergeLibraryMetadata(movie, metadata, onlyMissingMetadata);
  };
  const metadata = {
    name: 'Во все тяжкие',
    originalName: 'Breaking Bad',
    alternativeName: 'Во все тяжкие Breaking Bad 2008',
    universe: null,
    studio: 'AMC',
    genres: [{ id: 1 }],
    countries: ['США'],
    description: 'Школьный учитель химии становится производителем метамфетамина.',
    releaseDate: '2008-01-20',
    posterUrl: null,
    backdropUrl: null,
    backdropUrls: [],
    titleUrl: null,
    trailerUrl: null,
  } as unknown as MovieKpMetadata;

  it('restores missing metadata without touching downloaded media', () => {
    const movie = {
      title: 'unknown',
      originalTitle: null,
      alternativeTitles: null,
      universe: null,
      studio: null,
      description: null,
      country: null,
      releaseDate: null,
      genres: [],
      videoUrl: 'https://cdn.example/serial/master.m3u8',
    } as unknown as MovieEntity;

    mergeMetadata(movie, metadata, true);

    expect(movie).toMatchObject({
      title: 'Во все тяжкие',
      originalTitle: 'Breaking Bad',
      description: metadata.description,
      country: ['США'],
      releaseDate: '2008-01-20',
      studio: 'AMC',
      videoUrl: 'https://cdn.example/serial/master.m3u8',
    });
    expect(movie.genres).toEqual(metadata.genres);
  });

  it('does not overwrite complete fields in missing-only mode', () => {
    const movie = {
      title: 'Существующее название',
      originalTitle: 'Existing title',
      alternativeTitles: 'Existing aliases',
      studio: 'Existing studio',
      description: 'Существующее русское описание.',
      country: ['Канада'],
      releaseDate: '2020-01-01',
      genres: [{ id: 7 }],
    } as unknown as MovieEntity;

    mergeMetadata(movie, metadata, true);

    expect(movie).toMatchObject({
      title: 'Существующее название',
      originalTitle: 'Existing title',
      alternativeTitles: 'Existing aliases',
      studio: 'Existing studio',
      description: 'Существующее русское описание.',
      country: ['Канада'],
      releaseDate: '2020-01-01',
    });
    expect(movie.genres).toEqual([{ id: 7 }]);
  });
});

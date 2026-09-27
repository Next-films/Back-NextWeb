import { AdminReprocessPremiereAssetsCommandHandler } from '@/admin/application/handlers/admin-reprocess-premiere-assets.handler';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { MovieKpMetadata } from '@/movies/domain/types';

describe('AdminReprocessPremiereAssetsCommandHandler', () => {
  const logger = { setContext: jest.fn(), warn: jest.fn() };
  const handler = new AdminReprocessPremiereAssetsCommandHandler(
    logger as never,
    null as never,
    null as never,
    {
      hasRussianText: (value: string | null) => Boolean(value && /[А-Яа-яЁё]/.test(value)),
      isPlayablePremiereTrailer: (value: string | null) =>
        Boolean(value && /(?:youtube\.com|youtu\.be|\/trailer\/trailer\.mp4)/.test(value)),
    } as never,
    null as never,
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

  it('does not discard metadata when an optional asset cannot be generated', async () => {
    const subject = handler as unknown as {
      getOptionalLibraryAsset: (
        row: { id: number; type: 'serial'; kpId: string },
        asset: string,
        load: () => Promise<string | null>,
        result: { assetWarnings: number },
      ) => Promise<string | null>;
    };
    const refreshResult = { assetWarnings: 0 };

    const result = await subject.getOptionalLibraryAsset(
      { id: 18, type: 'serial', kpId: '5024113' },
      'background',
      () => Promise.reject(new Error('downloader unavailable')),
      refreshResult,
    );

    expect(result).toBeNull();
    expect(refreshResult.assetWarnings).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('serial:5024113'),
      'getOptionalLibraryAsset',
    );
  });

  it('selects cards without a video URL in missing-only mode', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const handlerWithDatabase = new AdminReprocessPremiereAssetsCommandHandler(
      logger as never,
      null as never,
      null as never,
      {
        hasRussianText: jest.fn(),
        isPlayablePremiereTrailer: jest.fn(),
      } as never,
      null as never,
      null as never,
      { query } as never,
    );
    const subject = handlerWithDatabase as unknown as {
      getPremieresForReprocess: (input: unknown) => Promise<unknown[]>;
    };

    await subject.getPremieresForReprocess({
      scope: 'premieres',
      type: 'film',
      handleStatus: 'all',
      onlyMissingAssets: true,
      limit: 50,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('m."videoUrl" IS NULL');
    expect(query.mock.calls[0][0]).toContain('btrim(m."videoUrl") = \'\'');
    expect(query.mock.calls[0][0]).toContain('m."availabilityStatus" <> \'available\'');
    expect(query.mock.calls[0][0]).toContain('"releaseDate"');
  });

  it('queues only released premieres that still have no video URL', () => {
    const subject = handler as unknown as {
      isReleasedPremiereWithoutVideo: (row: {
        kpId: string | null;
        videoUrl: string | null;
        availabilityStatus: string;
        releaseDate: string | null;
      }) => boolean;
    };

    expect(
      subject.isReleasedPremiereWithoutVideo({
        kpId: '7378605',
        videoUrl: null,
        availabilityStatus: 'released_no_video',
        releaseDate: '2026-09-01',
      }),
    ).toBe(true);
    expect(
      subject.isReleasedPremiereWithoutVideo({
        kpId: '7378605',
        videoUrl: 'https://cdn.example/movie/master.m3u8',
        availabilityStatus: 'available',
        releaseDate: '2026-09-01',
      }),
    ).toBe(false);
    expect(
      subject.isReleasedPremiereWithoutVideo({
        kpId: '7378605',
        videoUrl: null,
        availabilityStatus: 'upcoming',
        releaseDate: '2099-09-01',
      }),
    ).toBe(false);
  });

  it('groups and deduplicates download searches by media type and kpId', () => {
    const subject = handler as unknown as {
      createDownloadPayload: (rows: Array<{ type: string; kpId: string | null }>) => {
        films: string[];
        cartoons: string[];
        serials: string[];
      };
    };

    expect(
      subject.createDownloadPayload([
        { type: 'film', kpId: '7378605' },
        { type: 'film', kpId: '7378605' },
        { type: 'cartoon', kpId: '123' },
        { type: 'serial', kpId: '456' },
        { type: 'film', kpId: null },
      ]),
    ).toEqual({ films: ['7378605'], cartoons: ['123'], serials: ['456'] });
  });

  it('clears a stale player URL when no working trailer was found', () => {
    const subject = handler as unknown as {
      shouldUpdateTrailerUrl: (
        currentValue: string | null,
        nextValue: string | null,
        onlyMissingMetadata: boolean,
      ) => boolean;
    };

    expect(
      subject.shouldUpdateTrailerUrl(
        'https://play.poiskkino.dev/embed/6a64d4a7e0be6ddbcf1111e3',
        null,
        true,
      ),
    ).toBe(true);
    expect(
      subject.shouldUpdateTrailerUrl('https://www.youtube.com/watch?v=working', null, true),
    ).toBe(false);
  });
});

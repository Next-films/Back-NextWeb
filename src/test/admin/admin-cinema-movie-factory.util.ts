import { CommandBus } from '@nestjs/cqrs';

import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';

type CreateMovieFactoryInput = {
  commandBus: CommandBus;
  kinopoiskService: KinopoiskService;
  createNotificationCommand: (payload: { key: string; kpId: string; duration: number }) => unknown;
  createIsHandleCommand: (payload: { kpIds: string[] }) => unknown;
};

export function createAdminCinemaMovieFactory({
  commandBus,
  kinopoiskService,
  createNotificationCommand,
  createIsHandleCommand,
}: CreateMovieFactoryInput) {
  const createMovie = async (
    kpId: number,
    duration: number,
    resolvedValues: KinopoiskMovie,
  ): Promise<void> => {
    const kinopoiskSpy = jest.spyOn(kinopoiskService, 'getMovieById');

    kinopoiskSpy.mockResolvedValue(resolvedValues);

    const result = (await (commandBus as any).execute(
      createNotificationCommand({
        key: `https://video.com/${kpId}`,
        kpId: String(kpId),
        duration,
      }),
    )) as AppNotificationResult<null>;

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
  };

  const createProductionMovie = async (
    kpId: number,
    movieName: string,
    genres: string[] = ['Боевик', 'Кримина'],
    releaseDate: string = new Date('01.01.2025').toISOString(),
    duration: number = 1000,
    countries: string[] = ['Беларусь', 'Сша'],
  ): Promise<void> => {
    const resolvedValues: KinopoiskMovie = {
      id: kpId,
      name: `${movieName} ${kpId}`,
      alternativeName: `Alt name ${kpId}`,
      enName: `En name ${kpId}`,
      year: Number(releaseDate.split('.')[0]),
      description: `Desc ${kpId}`,
      logo: {
        url: `http://logo.com/${kpId}`,
      },
      poster: {
        url: `http://poster.com/${kpId}`,
      },
      videos: {
        trailers: [{ site: 'youtube', url: `https://trailer.com/${kpId}` }],
      },
      premiere: {
        world: releaseDate,
      },
      genres: genres.map(g => ({ name: g })),
      countries: countries.map(c => ({ name: c })),
    };

    await createMovie(kpId, duration, resolvedValues);
  };

  const createModerationMovie = async (
    kpId: number,
    movieName: string,
    duration: number = 1000,
  ): Promise<void> => {
    const resolvedValues: KinopoiskMovie = {
      id: kpId,
      name: `${movieName} ${kpId}`,
      alternativeName: `Alt name ${kpId}`,
      enName: `En name ${kpId}`,
      description: `Desc ${kpId}`,
    };

    await createMovie(kpId, duration, resolvedValues);
  };

  const createProcessingMovies = async (kpIds: string[], movieNames: string[]): Promise<void> => {
    const kinopoiskSpy = jest.spyOn(kinopoiskService, 'getMovieById');
    let callIndex = 0;

    // eslint-disable-next-line @typescript-eslint/require-await
    kinopoiskSpy.mockImplementation(async () => {
      const name = movieNames[callIndex] ?? '';
      callIndex++;
      return { name } as KinopoiskMovie;
    });

    const result = (await (commandBus as any).execute(
      createIsHandleCommand({ kpIds }),
    )) as AppNotificationResult<null>;

    kinopoiskSpy.mockRestore();

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);
  };

  return {
    createMovie,
    createProductionMovie,
    createModerationMovie,
    createProcessingMovies,
  };
}

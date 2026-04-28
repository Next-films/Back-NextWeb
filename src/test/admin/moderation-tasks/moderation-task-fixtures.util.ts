import { Admin } from '@/admin/domain/admin.entity';
import { FindTorApiTorrentFilmType, MovieTypesEnum } from '@/common/types/types';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { CartoonRepository } from '@/cartoons/infrastructure/cartoon.repository';
import { Film } from '@/films/domain/film.entity';
import { FilmRepository } from '@/films/infrastructure/film.repository';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { MovieCreateDto, MovieHandleStatus } from '@/movies/domain/types';

type CreateModerationTaskFixtureInput = {
  moderationFilmRepository: ModerationFilmRepository;
  moderationCartoonRepository: ModerationCartoonRepository;
  filmRepository: FilmRepository;
  cartoonRepository: CartoonRepository;
};

export function createModerationTaskFixtures({
  moderationFilmRepository,
  moderationCartoonRepository,
  filmRepository,
  cartoonRepository,
}: CreateModerationTaskFixtureInput) {
  const createTask = async (
    type: MovieTypesEnum,
    movieId: number,
    torrentData?: FindTorApiTorrentFilmType,
    admin?: Admin,
  ): Promise<void> => {
    const data: CreateModerationDto = {
      movieId,
    };

    if (torrentData) {
      data.torrentMetaData = torrentData;
    }

    if (admin) {
      data.admin = admin;
    }

    switch (type) {
      case MovieTypesEnum.FILM: {
        const moderationFilmEntity = ModerationFilmEntity.create<ModerationFilmEntity>(data);
        await moderationFilmRepository.save(moderationFilmEntity);
        return;
      }
      case MovieTypesEnum.CARTOON: {
        const moderationCartoonEntity =
          ModerationCartoonEntity.create<ModerationCartoonEntity>(data);
        await moderationCartoonRepository.save(moderationCartoonEntity);
        return;
      }
    }
  };

  const createMovie = async (
    type: MovieTypesEnum,
    kpId: string,
    movieName: string,
    hidden: boolean,
  ): Promise<number | null> => {
    const movieData: MovieCreateDto = {
      kpId,
      key: 'key',
      name: movieName,
      hidden,
      titleUrl: null,
      previewUrl: null,
      horizontalPreviewUrl: null,
      trailerUrl: null,
      backgroundContentUrl: null,
      genres: null,
      releaseDate: null,
      description: null,
      country: null,
      duration: 0,
      alternativeName: null,
      originalName: null,
      handleStatus: MovieHandleStatus.PROCESSING,
    };

    switch (type) {
      case MovieTypesEnum.FILM: {
        const film = Film.create(movieData);
        const result = await filmRepository.save(film);
        return result.id;
      }

      case MovieTypesEnum.CARTOON: {
        const cartoon = Cartoon.create(movieData);
        const result = await cartoonRepository.save(cartoon);

        return result.id;
      }

      default: {
        return null;
      }
    }
  };

  const createMovieAndTasks = async (
    count: number,
    type: MovieTypesEnum,
    hidden = true,
    torrentData?: FindTorApiTorrentFilmType,
    admin?: Admin,
  ) => {
    for (let i = 0; i < count; i++) {
      const movie = await createMovie(type, `${type}-${i + 1}`, `Movie ${i}`, hidden);

      if (!movie) {
        console.warn('Movie not created into tests');
        continue;
      }

      await createTask(type, movie, torrentData, admin);
    }
  };

  return {
    createMovieAndTasks,
  };
}

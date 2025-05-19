import 'reflect-metadata';
import dataSource from '../data-source';
import * as fs from 'fs/promises';
import * as path from 'path';
import { QueryRunner } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { Film } from '@/films/domain/film.entity';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';

type FilmJsonType = {
  id: string;
  backgroundImg: string;
  cardImg: string;
  description: string;
  subTitle: string;
  title: string;
  titleImg: string;
  type: string;
  films: string;
  ads: string;
  trailer: string;
  name: string;
  filtr: string[];
  date: string;
};

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

async function getGenres(queryRunner: QueryRunner, genres: string[]): Promise<Genre[]> {
  const genreEntities: Genre[] = [];

  for (const genreName of genres) {
    const handledName = genreName.toLowerCase();
    let genre = await queryRunner.manager.findOne(Genre, { where: { name: handledName } });

    if (!genre) {
      genre = queryRunner.manager.create(Genre, { name: handledName });
      await queryRunner.manager.save(genre);
    }

    genreEntities.push(genre);
  }

  return genreEntities;
}

async function importFilms() {
  let queryRunner: QueryRunner | null = null;

  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const filmsFilePath = path.resolve(__dirname, './data/films.json');
    const jsonData = await fs.readFile(filmsFilePath, 'utf-8');
    const films: FilmJsonType[] = JSON.parse(jsonData);

    for (const filmData of films) {
      const genres = await getGenres(queryRunner, filmData.filtr);
      const duration = MovieDurationUtil.parseDurationToSeconds(filmData.subTitle);
      const film = queryRunner.manager.create(Film, {
        country: ['Неизвестно'],
        duration,
        titleImg: filmData.titleImg,
        title: filmData.title,
        originalTitle: filmData.id,
        cardImg: filmData.cardImg,
        releaseDate: parseDate(filmData.date),
        backgroundImg: filmData.backgroundImg,
        alternativeTitles: filmData.name,
        videoUrl: filmData.films,
        trailerUrl: filmData.trailer,
        description: filmData.description,
        genres,
      });

      await queryRunner.manager.save(Film, film);
    }

    await queryRunner.commitTransaction();
    console.log('All films have been saved!');
  } catch (err) {
    console.error('Error during Data Source initialization or saving:', err);
    if (queryRunner) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }
  } finally {
    if (queryRunner) {
      await queryRunner.release();
    }
    await dataSource.destroy();
  }
}

importFilms();

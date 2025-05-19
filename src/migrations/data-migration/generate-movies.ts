import 'reflect-metadata';
import dataSource from '../data-source';
import * as fs from 'fs/promises';
import * as path from 'path';
import { QueryRunner } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { Film } from '@/films/domain/film.entity';
import { MovieDurationUtil } from '@/common/utils/movie-duration.util';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';

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

type CartoonsJsonType = FilmJsonType;

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

async function importMovies() {
  console.log('=>Generate movies migration');

  let queryRunner: QueryRunner | null = null;

  try {
    await dataSource.initialize();
    console.log('=>Data Source has been initialized!');

    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log('=>Start transaction');

    await importFilms(queryRunner);
    await importCartoons(queryRunner);

    await queryRunner.commitTransaction();
    console.log('=>Commit transaction');
  } catch (err) {
    console.error('=>Error during Data Source initialization or saving:', err);
    if (queryRunner) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackErr) {
        console.error('=>Rollback failed:', rollbackErr);
      }
    }
  } finally {
    if (queryRunner) {
      await queryRunner.release();
    }
    await dataSource.destroy();
  }
}

async function importFilms(queryRunner: QueryRunner) {
  console.log('=>Films import');

  const filmsFilePath = path.resolve(__dirname, './data/films.json');
  const jsonData = await fs.readFile(filmsFilePath, 'utf-8');
  const films: FilmJsonType[] = JSON.parse(jsonData);

  for (const filmData of films) {
    const {
      filtr,
      subTitle,
      id,
      cardImg,
      date,
      titleImg,
      title,
      backgroundImg,
      name,
      films,
      trailer,
      description,
    } = filmData;
    const genres = await getGenres(queryRunner, filtr);
    const duration = MovieDurationUtil.parseDurationToSeconds(subTitle);
    const film = queryRunner.manager.create(Film, {
      country: ['Неизвестно'],
      duration,
      titleImg,
      title,
      originalTitle: id,
      cardImg,
      releaseDate: parseDate(date),
      backgroundImg,
      alternativeTitles: name,
      videoUrl: films,
      trailerUrl: trailer,
      description,
      genres,
    });

    await queryRunner.manager.save(Film, film);
  }

  console.log('=>All films have been saved!');
}

async function importCartoons(queryRunner: QueryRunner): Promise<void> {
  console.log('=>Cartoons import');

  const cartoonsFilePath = path.resolve(__dirname, './data/cartoons.json');
  const jsonData = await fs.readFile(cartoonsFilePath, 'utf-8');
  const cartoons: CartoonsJsonType[] = JSON.parse(jsonData);

  for (const cartonData of cartoons) {
    const {
      filtr,
      subTitle,
      id,
      cardImg,
      date,
      titleImg,
      title,
      backgroundImg,
      name,
      films,
      trailer,
      description,
    } = cartonData;
    const genres = await getGenres(queryRunner, filtr);
    const duration = MovieDurationUtil.parseDurationToSeconds(subTitle);
    const cartoon = queryRunner.manager.create(Cartoon, {
      country: ['Неизвестно'],
      duration,
      titleImg,
      title,
      originalTitle: id,
      cardImg,
      releaseDate: parseDate(date),
      backgroundImg,
      alternativeTitles: name,
      videoUrl: films,
      trailerUrl: trailer,
      description,
      genres,
    });

    await queryRunner.manager.save(Cartoon, cartoon);
  }

  console.log('=>All cartoons have been saved!');
}

importMovies();

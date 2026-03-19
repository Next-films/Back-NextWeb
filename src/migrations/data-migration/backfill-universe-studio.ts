import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { Serial } from '@/serials/domain/serial.entity';
import { KinopoiskService } from '@/external-api/kinopoisk/application/kinopoisk.service';
import { MoviesService } from '@/movies/application/movies.service';
import { MovieEntity } from '@/movies/domain/movie.entity';

type BackfillStats = {
  total: number;
  updated: number;
  unchanged: number;
  skippedInvalidKpId: number;
  notFoundInKinopoisk: number;
  failed: number;
};

const FORCE_REWRITE = process.env.FORCE_REWRITE_UNIVERSE_STUDIO === '1';

function isEmpty(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

async function backfillCollection<T extends MovieEntity>(
  label: string,
  repository: Repository<T>,
  kinopoiskService: KinopoiskService,
  moviesService: MoviesService,
): Promise<BackfillStats> {
  const stats: BackfillStats = {
    total: 0,
    updated: 0,
    unchanged: 0,
    skippedInvalidKpId: 0,
    notFoundInKinopoisk: 0,
    failed: 0,
  };

  const items = await repository
    .createQueryBuilder('m')
    .where('m.kpId IS NOT NULL')
    .andWhere(`TRIM(m.kpId) <> ''`)
    .orderBy('m.id', 'ASC')
    .getMany();

  stats.total = items.length;
  console.log(`[${label}] found ${stats.total} items`);

  for (const item of items) {
    try {
      const parsedKpId = Number(item.kpId);
      if (!Number.isFinite(parsedKpId) || parsedKpId <= 0) {
        stats.skippedInvalidKpId += 1;
        continue;
      }

      const kpMovie = await kinopoiskService.getMovieById(parsedKpId);
      if (!kpMovie) {
        stats.notFoundInKinopoisk += 1;
        continue;
      }

      const extracted = moviesService.extractUniverseAndStudio(kpMovie);

      const nextUniverse = FORCE_REWRITE
        ? extracted.universe
        : item.universe || extracted.universe || null;
      const nextStudio = FORCE_REWRITE ? extracted.studio : item.studio || extracted.studio || null;

      const currentUniverse = item.universe || null;
      const currentStudio = item.studio || null;

      if (
        currentUniverse === nextUniverse ||
        (!FORCE_REWRITE && !isEmpty(currentUniverse) && !isEmpty(nextUniverse))
      ) {
        if (
          currentStudio === nextStudio ||
          (!FORCE_REWRITE && !isEmpty(currentStudio) && !isEmpty(nextStudio))
        ) {
          stats.unchanged += 1;
          continue;
        }
      }

      item.universe = nextUniverse;
      item.studio = nextStudio;
      await repository.save(item);
      stats.updated += 1;
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${label}] failed for id=${item.id}, kpId=${item.kpId}: ${message}`);
    }
  }

  return stats;
}

function printStats(label: string, stats: BackfillStats): void {
  console.log(
    `[${label}] total=${stats.total}, updated=${stats.updated}, unchanged=${stats.unchanged}, invalidKpId=${stats.skippedInvalidKpId}, notFound=${stats.notFoundInKinopoisk}, failed=${stats.failed}`,
  );
}

async function run(): Promise<void> {
  if (!process.env.ENV) {
    process.env.ENV = 'DEVELOPMENT';
  }

  const { AppModule } = await import('../../app.module');

  console.log('=> Backfill universe/studio started');
  console.log(`=> mode: ${FORCE_REWRITE ? 'force-rewrite' : 'fill-empty-only'}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const kinopoiskService = app.get(KinopoiskService);
    const moviesService = app.get(MoviesService);

    const filmStats = await backfillCollection(
      'films',
      dataSource.getRepository(Film),
      kinopoiskService,
      moviesService,
    );
    printStats('films', filmStats);

    const cartoonStats = await backfillCollection(
      'cartoons',
      dataSource.getRepository(Cartoon),
      kinopoiskService,
      moviesService,
    );
    printStats('cartoons', cartoonStats);

    const serialStats = await backfillCollection(
      'serials',
      dataSource.getRepository(Serial),
      kinopoiskService,
      moviesService,
    );
    printStats('serials', serialStats);
  } finally {
    await app.close();
  }

  console.log('=> Backfill universe/studio finished');
}

run().catch(error => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error('=> Backfill failed:', message);
  process.exit(1);
});

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Genre } from '@/movies/domain/genre.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GenerateGenreMigration implements OnModuleInit {
  private readonly dataPatch: string = './data/genre.json';
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(GenerateGenreMigration.name);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Generate genre migration: Migration is running');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await this.generate(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Generate genre migration: Migration is completed');
    } catch (e) {
      this.logger.error(e, this.onModuleInit.name);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async generate(queryRunner: QueryRunner): Promise<void> {
    const genresFilePath = path.resolve(__dirname, this.dataPatch);
    const fileContent = await fs.readFile(genresFilePath, 'utf-8');
    const genres: string[] = JSON.parse(fileContent);

    const existingGenres: string[] = [];
    const createdGenres: string[] = [];

    for (const genreNameRaw of genres) {
      const genreName = genreNameRaw.toLowerCase().trim();

      const existing = await queryRunner.manager.findOne(this.genreRepository.target, {
        where: { name: genreName },
      });

      if (!existing) {
        const genre = queryRunner.manager.create(this.genreRepository.target, { name: genreName });
        await queryRunner.manager.save(genre);
        createdGenres.push(genreName);
      } else {
        existingGenres.push(genreName);
      }
    }

    this.logger.log(`New created genres: ${JSON.stringify(createdGenres)}`);
    this.logger.log(`Already existing genres: ${JSON.stringify(existingGenres)}`);
  }
}

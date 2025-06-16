import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { KINOPOISK_METHODS_CONSTANTS } from '@/external-api/kinopoisk/domain/kinopoisk.constants';
import { KinopoiskMovie } from '@/external-api/kinopoisk/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';

@Injectable()
export class KinopoiskService {
  private readonly MOVIES: string = `/${KINOPOISK_METHODS_CONSTANTS.MOVIE.MOVIE}`;
  constructor(
    protected readonly logger: LoggerService,
    private readonly httpService: HttpService,
  ) {
    this.logger.setContext(KinopoiskService.name);
  }

  async getMovieById(movieId: number): Promise<KinopoiskMovie | null> {
    try {
      const url = `${this.MOVIES}/${movieId}`;

      const response = await this.httpService.axiosRef.get<KinopoiskMovie>(url);

      return response.data || null;
    } catch (error) {
      this.logger.error(error, this.getMovieById.name);

      return null;
    }
  }
}

export class KinopoiskServiceMock extends KinopoiskService {
  constructor(logger: LoggerService, httpService: HttpService) {
    super(logger, httpService);
    this.logger.setContext(KinopoiskServiceMock.name);
  }

  async getMovieById(): Promise<KinopoiskMovie | null> {
    this.logger.log('Get movie by id (mock)', this.getMovieById.name);
    await new Promise(resolve => resolve(null));
    return {
      id: 12345,
      name: 'Film name',
      description: 'desc',
    };
  }
}

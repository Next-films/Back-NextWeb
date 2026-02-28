import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmsPublicOutputDtoMapper } from '@/films/api/dtos/output/films-public.output.dto';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { GetFilmsInputQuery } from '@/films/api/dtos/input/get-films.input-query';
import { FilmPublicQueryRepository } from '@/films/infrastructure/film-public.query-repository';
import { MoviesPublicOutputDto } from '@/movies/api/dtos/output/movie-public.output.dto';

export class GetPublicFilmsQuery implements IQuery {
  constructor(public query: GetFilmsInputQuery) {}
}

@QueryHandler(GetPublicFilmsQuery)
export class GetPublicFilmsQueryHandler
  implements
    IQueryHandler<
      GetPublicFilmsQuery,
      AppNotificationResult<PaginationUtil<MoviesPublicOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmPublicQueryRepository: FilmPublicQueryRepository,
    private readonly filmsPublicOutputDtoMapper: FilmsPublicOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetPublicFilmsQueryHandler.name);
  }

  async execute(
    query: GetPublicFilmsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<MoviesPublicOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName, searchGenreIds } = query.query;
    this.logger.log(`Get films command`, this.execute.name);
    try {
      const totalCount = await this.filmPublicQueryRepository.getFilmsCount(
        searchName || null,
        searchGenreIds || null,
      );
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const skip = this.paginationUtil.calculatePaginationSkip(page, size);

      const films = await this.filmPublicQueryRepository.getFilms(
        sortField,
        sortDirection,
        skip,
        size,
        searchName || null,
        searchGenreIds || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        films && films.length > 0 ? this.filmsPublicOutputDtoMapper.mapAllPublicMovies(films) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

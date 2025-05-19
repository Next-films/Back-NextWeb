import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { FilmQueryRepository } from '@/films/infrastructure/film.query-repository';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { FilmsOutputDto, FilmsOutputDtoMapper } from '@/films/api/dtos/output/films.output.dto';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { GetFilmsInputQuery } from '@/films/api/dtos/input/get-films.input-query';

export class GetFilmsQuery implements IQuery {
  constructor(public query: GetFilmsInputQuery) {}
}

@QueryHandler(GetFilmsQuery)
export class GetFilmsQueryHandler
  implements
    IQueryHandler<
      GetFilmsQuery,
      AppNotificationResult<PaginationUtil<FilmsOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly filmQueryRepository: FilmQueryRepository,
    private readonly filmsOutputDtoMapper: FilmsOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetFilmsQueryHandler.name);
  }

  async execute(
    query: GetFilmsQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<FilmsOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    const { page, size, sortField, sortDirection, searchName } = query.query;
    this.logger.log(`Get films command`, this.execute.name);
    try {
      const totalCount = await this.filmQueryRepository.getFilmsCount(searchName || null);
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const films = await this.filmQueryRepository.getFilms(
        sortField,
        sortDirection,
        searchName || null,
      );

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        films && films.length > 0 ? this.filmsOutputDtoMapper.mapMovies(films) : [],
      );

      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

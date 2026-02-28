import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { GenreQueryRepository } from '@/movies/infrastructure/genre.query-repository';
import { GenreOutputDto, GenreOutputDtoMapper } from '@/movies/api/dtos/output/genre.output.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { GetAllGenreInputQueryDto } from '@/movies/api/dtos/input/get-all-genre.input-query.dto';

export class GetAllGenreQuery implements IQuery {
  constructor(public query: GetAllGenreInputQueryDto) {}
}

@QueryHandler(GetAllGenreQuery)
export class GetAllGenreQueryHandler
  implements
    IQueryHandler<
      GetAllGenreQuery,
      AppNotificationResult<PaginationUtil<GenreOutputDto[]>, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly genreQueryRepository: GenreQueryRepository,
    private readonly genreOutputDtoMapper: GenreOutputDtoMapper,
    private readonly paginationUtil: PaginationUtil,
  ) {
    this.logger.setContext(GetAllGenreQueryHandler.name);
  }

  async execute(
    query: GetAllGenreQuery,
  ): Promise<
    AppNotificationResult<PaginationUtil<GenreOutputDto[]>, ErrorFieldExceptionDto | null>
  > {
    this.logger.log(`Get all genre command`, this.execute.name);
    const { searchName, page, size } = query.query;
    try {
      const totalCount = await this.genreQueryRepository.getGenresCount(searchName || null);
      const pagesCount = this.paginationUtil.calculatePageCount(totalCount, size);

      const isValidPage = this.paginationUtil.isValidPage(page, pagesCount, totalCount);

      if (!isValidPage)
        return this.appNotification.badRequest({
          field: 'page',
          message: 'Incorrect page',
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_PAGE,
        });

      const skip = this.paginationUtil.calculatePaginationSkip(page, size);
      const genres = await this.genreQueryRepository.getGenres(skip, size, searchName || null);

      const result = this.paginationUtil.create(
        totalCount,
        pagesCount,
        page,
        size,
        genres ? this.genreOutputDtoMapper.mapGenres(genres) : [],
      );
      return this.appNotification.success(result);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

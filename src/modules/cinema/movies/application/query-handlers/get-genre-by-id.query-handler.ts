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

export class GetGenreByIdQuery implements IQuery {
  constructor(public genreId: number) {}
}

@QueryHandler(GetGenreByIdQuery)
export class GetGenreByIdQueryHandler
  implements
    IQueryHandler<
      GetGenreByIdQuery,
      AppNotificationResult<GenreOutputDto, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly genreQueryRepository: GenreQueryRepository,
    private readonly genreOutputDtoMapper: GenreOutputDtoMapper,
  ) {
    this.logger.setContext(GetGenreByIdQueryHandler.name);
  }

  async execute(
    query: GetGenreByIdQuery,
  ): Promise<AppNotificationResult<GenreOutputDto, ErrorFieldExceptionDto | null>> {
    const { genreId } = query;
    this.logger.log(`Get genre by id command: ${genreId}`, this.execute.name);
    try {
      const genre = await this.genreQueryRepository.getById(genreId);

      if (!genre)
        return this.appNotification.notFound({
          field: 'genreId',
          message: 'Genre not found',
          errorKey: EXCEPTION_KEYS_ENUM.GENRE_NOT_FOUND,
        });

      return this.appNotification.success(this.genreOutputDtoMapper.mapGenre(genre));
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

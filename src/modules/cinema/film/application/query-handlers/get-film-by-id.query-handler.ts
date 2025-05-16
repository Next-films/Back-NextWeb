import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';

// TODO:
export class GetFilmByIdQuery implements IQuery {
  constructor(public filmId: number) {}
}

@QueryHandler(GetFilmByIdQuery)
export class GetFilmByIdQueryHandler
  implements IQueryHandler<GetFilmByIdQuery, AppNotificationResult<null, null>>
{
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(GetFilmByIdQueryHandler.name);
  }

  async execute(query: GetFilmByIdQuery): Promise<AppNotificationResult<null, null>> {
    const { filmId } = query;
    this.logger.log(`Get film by id command: ${filmId}`, this.execute.name);
    try {
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }
}

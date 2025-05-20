import { Body, Controller, Post } from '@nestjs/common';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ADMIN_GENRE_ROUTE } from '@/common/constants/route.constants';
import { SwaggerDecoratorGenreCreate } from '@/admin/api/swagger/genre-create.swagger.decorator';
import { GenreCreateInputDto } from '@/admin/api/dtos/input/genre-create.input.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { GetGenreByIdQuery } from '@/movies/application/query-handlers/get-genre-by-id.query-handler';
import { GenreOutputDto } from '@/movies/api/dtos/output/genre.output.dto';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminGenreCreateCommand } from '@/admin/application/handlers/admin-genre-create.handler';

@ApiTags('Admin - genres')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@Controller(ADMIN_GENRE_ROUTE.MAIN)
export class AdminGenreController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminGenreController.name);
  }

  @Post()
  @SwaggerDecoratorGenreCreate()
  async createGenre(@Body() body: GenreCreateInputDto): Promise<any> {
    this.logger.log('Execute: create genre', this.createGenre.name);
    const result = await this.commandBus.execute<
      AdminGenreCreateCommand,
      AppNotificationResult<number, ErrorFieldExceptionDto | null>
    >(new AdminGenreCreateCommand(body.name));

    this.logger.log(result.appResult, this.createGenre.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const genre = await this.queryBus.execute<
        GetGenreByIdQuery,
        AppNotificationResult<GenreOutputDto>
      >(new GetGenreByIdQuery(result.data!));
      return genre.data;
    }

    this.appNotification.handleHttpResult(result);
  }
}

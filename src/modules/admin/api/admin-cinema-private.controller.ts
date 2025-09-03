import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ModerateRequestPayloadDto } from '@/admin/api/dtos/input/admin-moderate-movie.input.dto';
import { CommandBus } from '@nestjs/cqrs';
import { AdminModerateRequestByTorrentCommand } from '@/admin/application/handlers/admin-moderate-movie-request-by-torrent.handler';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { ADMIN_PRIVATE_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { SwaggerDecoratorAdminPrivateCinemaModerationRequest } from '@/admin/api/swagger/admin-private-cinema-moderation.swagger.decorator';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@ApiTags('Private - admin private cinema. Only for interaction between backends')
@UseFilters(HttpPrivateExceptionsFilter)
@Controller(ADMIN_PRIVATE_CINEMA_ROUTE.MAIN)
export class AdminCinemaPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly applicationNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaPrivateController.name);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(ADMIN_PRIVATE_CINEMA_ROUTE.MODERATION)
  @SwaggerDecoratorAdminPrivateCinemaModerationRequest()
  async moderateMovie(
    @Body() body: ModerateRequestPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: Moderate movie request by torrent`, this.moderateMovie.name);

    const result = await this.commandBus.execute<
      AdminModerateRequestByTorrentCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminModerateRequestByTorrentCommand(body));

    this.logger.log(result.appResult, this.moderateMovie.name);

    return this.applicationNotification.handleHttpResult(result, true);
  }
}

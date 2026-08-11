import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
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
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { PRIVATE_SERIALS_ROUTE } from '@/common/constants/route.constants';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { NewSerialNotificationPayloadDto } from '@/serials/api/dtos/input/new-serial-notification.input.dto';
import { NewSerialNotificationCommand } from '@/serials/application/handlers/new-serial-notification.handler';
import { NewSerialIsHandleNotificationCommand } from '@/serials/application/handlers/new-serial-is-handle-notification.handler';
import { GetPrivateSerialByKinopoiskIdQuery } from '@/serials/application/query-handlers/get-private-serial-by-kinopoisk-id.query-handler';
import { SerialPrivateOutputDto } from '@/serials/api/dtos/output/serials-private.output.dto';
import { SwaggerDecoratorGetPrivateSerialByKinopoiskId } from '@/serials/api/swagger/get-private-serial-by-kinopoisk-id.swagger.decorator';
import { SwaggerDecoratorNewSerial } from '@/serials/api/swagger/new-serial-private.swagger.decorator';
import { SwaggerDecoratorNewSerialIsHandle } from '@/serials/api/swagger/new-serial-is-handle-private.swagger.decorator';
import { SwaggerDecoratorNewBackgroundContentForSerial } from '@/serials/api/swagger/new-background-content-private.swagger.decorator';
import { NewSerialBackGroundContentPayloadDto } from '@/serials/api/dtos/input/new-serial-background-content.input.dto';
import { NewBackGroundContentSerialCommand } from '@/serials/application/handlers/new-background-content-serial.handler';
import { UpsertUpcomingMoviePayloadDto } from '@/movies/api/dtos/input/upsert-upcoming-movie.input.dto';
import { UpsertUpcomingSerialCommand } from '@/serials/application/handlers/upsert-upcoming-serial.handler';
import { UpsertUpcomingMovieOutputDto } from '@/movies/api/dtos/output/upsert-upcoming-movie.output.dto';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('Private - serials. Only for interaction between backends')
@Controller(PRIVATE_SERIALS_ROUTE.MAIN)
export class SerialPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(SerialPrivateController.name);
  }

  @Get(`:kpId/${PRIVATE_SERIALS_ROUTE.KP}`)
  @SwaggerDecoratorGetPrivateSerialByKinopoiskId()
  async getSerialByKpId(
    @Param('kpId') kpId: string,
  ): Promise<AppNotificationResult<SerialPrivateOutputDto, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: Get serial by kinopoisk id`, this.getSerialByKpId.name);

    const result = await this.queryBus.execute<
      GetPrivateSerialByKinopoiskIdQuery,
      AppNotificationResult<SerialPrivateOutputDto, ErrorFieldExceptionDto | null>
    >(new GetPrivateSerialByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getSerialByKpId.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_SERIALS_ROUTE.UPCOMING}`)
  async upsertUpcomingSerial(
    @Body() body: UpsertUpcomingMoviePayloadDto,
  ): Promise<AppNotificationResult<
    UpsertUpcomingMovieOutputDto,
    ErrorFieldExceptionDto | null
  > | void> {
    this.logger.log(`Execute: Upsert upcoming serial`, this.upsertUpcomingSerial.name);

    const result = await this.commandBus.execute<
      UpsertUpcomingSerialCommand,
      AppNotificationResult<UpsertUpcomingMovieOutputDto, ErrorFieldExceptionDto | null>
    >(new UpsertUpcomingSerialCommand(body));

    this.logger.log(result.appResult, this.upsertUpcomingSerial.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_SERIALS_ROUTE.NEW_SERIAL_IS_HANDLE}`)
  @SwaggerDecoratorNewSerialIsHandle()
  async newSerialIsHandle(
    @Body() body: NewMovieIsHandleNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New serial is handle notification`, this.newSerialIsHandle.name);

    const result = await this.commandBus.execute<
      NewSerialIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewSerialIsHandleNotificationCommand(body));

    this.logger.log(result.appResult, this.newSerialIsHandle.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_SERIALS_ROUTE.NEW_SERIAL}`)
  @SwaggerDecoratorNewSerial()
  async newSerial(
    @Body() body: NewSerialNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New serial notification`, this.newSerial.name);

    const result = await this.commandBus.execute<
      NewSerialNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewSerialNotificationCommand(body));

    this.logger.log(result.appResult, this.newSerial.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`${PRIVATE_SERIALS_ROUTE.NEW_BACKGROUND_CONTENT}`)
  @SwaggerDecoratorNewBackgroundContentForSerial()
  async newBackgroundContent(
    @Body() body: NewSerialBackGroundContentPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: new background content for serial`, this.newBackgroundContent.name);

    const result = await this.commandBus.execute<
      NewBackGroundContentSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewBackGroundContentSerialCommand(body.url, body.movieId));

    this.logger.log(result.appResult, this.newBackgroundContent.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}

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
import { PRIVATE_CARTOONS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { SwaggerDecoratorGetPrivateCartoonByKinopoiskId } from '@/cartoons/api/swagger/get-private-cartoon-by-kinopoisk-id.swagger.decorator';
import { GetPrivateCartoonByKinopoiskIdQuery } from '@/cartoons/application/query-handlers/get-private-cartoon-by-kinopoisk-id.query-handler';
import { CartoonsPrivateOutputDto } from '@/cartoons/api/dtos/output/cartoons-private.output.dto';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { NewCartoonNotificationPayloadDto } from '@/cartoons/api/dtos/input/new-cartoon-notification.input.dto';
import { NewCartoonNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-notification.handler';
import { NewMovieIsHandleNotificationPayloadDto } from '@/movies/api/dtos/input/new-movie-is-handle-notification.input.dto';
import { NewCartoonIsHandleNotificationCommand } from '@/cartoons/application/handlers/new-cartoon-is-handle-notification.handler';
import { SwaggerDecoratorNewCartoon } from '@/cartoons/api/swagger/new-cartoon-private.swagger.decorator';
import { SwaggerDecoratorNewCartoonIsHandle } from '@/cartoons/api/swagger/new-cartoon-is-handle-private.swagger.decorator';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { NewCartoonBackGroundContentPayloadDto } from '@/cartoons/api/dtos/input/new-cartoon-background-content.input.dto';
import { NewBackGroundContentCartoonCommand } from '@/cartoons/application/handlers/new-background-content-cartoon.handler';
import { SwaggerDecoratorNewBackgroundContentForCartoon } from '@/cartoons/api/swagger/new-background-content-private.swagger.decorator';
import { UpsertUpcomingMoviePayloadDto } from '@/movies/api/dtos/input/upsert-upcoming-movie.input.dto';
import { UpsertUpcomingCartoonCommand } from '@/cartoons/application/handlers/upsert-upcoming-cartoon.handler';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('Private - cartoons. Only for interaction between backends')
@Controller(PRIVATE_CARTOONS_ROUTE.MAIN)
export class CartoonPrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(CartoonPrivateController.name);
  }

  @Get(`:kpId/${PRIVATE_CARTOONS_ROUTE.KP}`)
  @SwaggerDecoratorGetPrivateCartoonByKinopoiskId()
  async getCartoonByKpId(
    @Param('kpId') kpId: string,
  ): Promise<AppNotificationResult<
    CartoonsPrivateOutputDto,
    ErrorFieldExceptionDto | null
  > | void> {
    this.logger.log(`Execute: Get cartoon by kinopoisk id`, this.getCartoonByKpId.name);

    const result = await this.queryBus.execute<
      GetPrivateCartoonByKinopoiskIdQuery,
      AppNotificationResult<CartoonsPrivateOutputDto, ErrorFieldExceptionDto | null>
    >(new GetPrivateCartoonByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getCartoonByKpId.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_CARTOONS_ROUTE.UPCOMING}`)
  async upsertUpcomingCartoon(
    @Body() body: UpsertUpcomingMoviePayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: Upsert upcoming cartoon`, this.upsertUpcomingCartoon.name);

    const result = await this.commandBus.execute<
      UpsertUpcomingCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new UpsertUpcomingCartoonCommand(body));

    this.logger.log(result.appResult, this.upsertUpcomingCartoon.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_CARTOONS_ROUTE.NEW_CARTOON}`)
  @SwaggerDecoratorNewCartoon()
  async newCartoon(
    @Body() body: NewCartoonNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New cartoon notification`, this.newCartoon.name);

    const result = await this.commandBus.execute<
      NewCartoonNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewCartoonNotificationCommand(body));

    this.logger.log(result.appResult, this.newCartoon.name);

    return this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post(`${PRIVATE_CARTOONS_ROUTE.NEW_CARTOON_IS_HANDLE}`)
  @SwaggerDecoratorNewCartoonIsHandle()
  async newCartoonIsHandle(
    @Body() body: NewMovieIsHandleNotificationPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: New cartoon is handle notification`, this.newCartoonIsHandle.name);

    const result = await this.commandBus.execute<
      NewCartoonIsHandleNotificationCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewCartoonIsHandleNotificationCommand(body));

    this.logger.log(result.appResult, this.newCartoonIsHandle.name);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`${PRIVATE_CARTOONS_ROUTE.NEW_BACKGROUND_CONTENT}`)
  @SwaggerDecoratorNewBackgroundContentForCartoon()
  async newBackgroundContent(
    @Body() body: NewCartoonBackGroundContentPayloadDto,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null> | void> {
    this.logger.log(`Execute: new background content for cartoon`, this.newBackgroundContent.name);

    const result = await this.commandBus.execute<
      NewBackGroundContentCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new NewBackGroundContentCartoonCommand(body.url, body.movieId));

    this.logger.log(result.appResult, this.newBackgroundContent.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}

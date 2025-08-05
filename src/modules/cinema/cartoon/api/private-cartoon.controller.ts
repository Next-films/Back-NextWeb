import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@UseFilters(HttpPrivateExceptionsFilter)
@ApiTags('Private - cartoons')
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
}

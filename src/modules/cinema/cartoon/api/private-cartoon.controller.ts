import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { PRIVATE_CARTOONS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { SwaggerDecoratorGetPrivateCartoonByKinopoiskId } from '@/cartoons/api/swagger/get-private-cartoon-by-kinopoisk-id.swagger.decorator';
import { GetPrivateCartoonByKinopoiskIdQuery } from '@/cartoons/application/query-handlers/get-private-cartoon-by-kinopoisk-id.query-handler';
import { CartoonsPrivateOutputDto } from '@/cartoons/api/dtos/output/cartoons-private.output.dto';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';

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
}

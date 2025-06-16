import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PRIVATE_CARTOONS_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { QueryBus } from '@nestjs/cqrs';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import { SwaggerDecoratorGetCartoonByKinopoiskId } from '@/cartoons/api/swagger/get-cartoon-by-kinopoisk-id.swagger.decorator';
import { GetCartoonByKinopoiskIdQuery } from '@/cartoons/application/query-handlers/get-cartoon-by-kinopoisk-id.query-handler';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(ApiCinemaAccessTokenGuard)
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

  @Get(':kpId')
  @SwaggerDecoratorGetCartoonByKinopoiskId()
  async getCartoonByKpId(@Param('kpId') kpId: string): Promise<CartoonsOutputDto | void> {
    this.logger.log(`Execute: Get cartoon by kinopoisk id`, this.getCartoonByKpId.name);

    const result = await this.queryBus.execute<
      GetCartoonByKinopoiskIdQuery,
      AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetCartoonByKinopoiskIdQuery(kpId));

    this.logger.log(result.appResult, this.getCartoonByKpId.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

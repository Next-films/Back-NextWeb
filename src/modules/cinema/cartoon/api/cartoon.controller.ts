import { Controller, Get, Param, Query } from '@nestjs/common';
import { CARTOONS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { QueryBus } from '@nestjs/cqrs';
import { SwaggerDecoratorGetCartoonById } from '@/cartoons/api/swagger/get-cartoon-by-id.swagger.decorator';
import { SwaggerDecoratorGetCartoons } from '@/cartoons/api/swagger/get-cartoons.swagger.decorator';
import { GetCartoonInputQuery } from '@/cartoons/api/dtos/input/get-cartoon.input-query';
import { CartoonsOutputDto } from '@/cartoons/api/dtos/output/cartoons.output.dto';
import { GetCartoonByIdQuery } from '@/cartoons/application/query-handlers/get-cartoon-by-id.query-handler';
import { GetCartoonsQuery } from '@/cartoons/application/query-handlers/get-cartoons.query-handler';

@ApiTags('Public - cartoons')
@Controller(CARTOONS_ROUTE.MAIN)
export class CartoonController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(CartoonController.name);
  }

  @Get()
  @SwaggerDecoratorGetCartoons()
  async getAllCartoons(
    @Query() query: GetCartoonInputQuery,
  ): Promise<PaginationUtil<CartoonsOutputDto[]> | void> {
    this.logger.log(`Execute: Get cartoons`, this.getAllCartoons.name);

    const result = await this.queryBus.execute<
      GetCartoonsQuery,
      AppNotificationResult<PaginationUtil<CartoonsOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new GetCartoonsQuery(query));

    this.logger.log(result.appResult, this.getAllCartoons.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(`:cartoonId`)
  @SwaggerDecoratorGetCartoonById()
  async getCartoonById(
    @Param('cartoonId', ParseIntPatchPipe) cartoonId: number,
  ): Promise<CartoonsOutputDto | void> {
    this.logger.log(`Execute: Get cartoon by id: ${cartoonId}`, this.getCartoonById.name);

    const result = await this.queryBus.execute<
      GetCartoonByIdQuery,
      AppNotificationResult<CartoonsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetCartoonByIdQuery(cartoonId));

    this.logger.log(result.appResult, this.getCartoonById.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

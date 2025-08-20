import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';
import { SwaggerDecoratorAdminGetAllCartoons } from '@/admin/api/swagger/admin-get-all-cartoons.swagger.decorator';
import { SwaggerDecoratorAdminCreateCartoon } from '@/admin/api/swagger/admin-add-cartoon.swagger.decorator';
import { SwaggerDecoratorAdminUpdateCartoonById } from '@/admin/api/swagger/admin-update-cartoon-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveCartoonById } from '@/admin/api/swagger/admin-remove-cartoon-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideCartoonById } from '@/admin/api/swagger/admin-show-hide-cartoon-by-id.swagger.decorator';
import { AdminGetAllCartoonsInputQueryDto } from '@/admin/api/dtos/input/admin-get-all-cartoons.input-query.dto';
import { AdminCinemaCartoonsOutputDto } from '@/admin/api/dtos/output/admin-cinema-cartoons.output.dto';
import { AdminUpdateCartoonInputDto } from '@/admin/api/dtos/input/admin-update-cartoon.input.dto';
import { AdminShowOrHiddeCartoonInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-cartoon.input.dto';
import { AdminGetAllCartoonsQuery } from '@/admin/application/query-handlers/admin-get-all-cartoons.query-handler';
import { AdminUpdateCartoonCommand } from '@/admin/application/handlers/admin-update-cartoon.handler';
import { AdminRemoveCartoonCommand } from '@/admin/application/handlers/admin-remove-cartoon.handler';
import { AdminShowOrHiddeCartoonCommand } from '@/admin/application/handlers/admin-show-or-hide-cartoon.handler';

@ApiTags('Admin cinema - cartoons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.CARTOONS}`)
export class AdminCinemaCartoonsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaCartoonsController.name);
  }

  @Get()
  @SwaggerDecoratorAdminGetAllCartoons()
  async getAllCartoons(
    @Query() query: AdminGetAllCartoonsInputQueryDto,
  ): Promise<PaginationUtil<AdminCinemaCartoonsOutputDto[]> | void> {
    this.logger.log('Execute: get all cartoons by admin', this.getAllCartoons.name);

    const result = await this.queryBus.execute<
      AdminGetAllCartoonsQuery,
      AppNotificationResult<
        PaginationUtil<AdminCinemaCartoonsOutputDto[]>,
        ErrorFieldExceptionDto | null
      >
    >(new AdminGetAllCartoonsQuery(query));

    this.logger.log(result.appResult, this.getAllCartoons.name);

    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  // TODO:
  @Post()
  @SwaggerDecoratorAdminCreateCartoon()
  addCartoon() {
    throw new InternalServerErrorException('Method not implemented');
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`:cartoonId`)
  @SwaggerDecoratorAdminUpdateCartoonById()
  async updateCartoon(
    @Param('cartoonId', ParseIntPatchPipe) cartoonId: number,
    @Body() body: AdminUpdateCartoonInputDto,
  ): Promise<void> {
    this.logger.log('Execute: update cartoon by admin', this.updateCartoon.name);

    const result = await this.commandBus.execute<
      AdminUpdateCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminUpdateCartoonCommand(cartoonId, body));

    this.logger.log(result.appResult, this.updateCartoon.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:cartoonId`)
  @SwaggerDecoratorAdminRemoveCartoonById()
  async removeCartoon(@Param('cartoonId', ParseIntPatchPipe) cartoonId: number): Promise<void> {
    this.logger.log('Execute: remove cartoon by admin', this.removeCartoon.name);

    const result = await this.commandBus.execute<
      AdminRemoveCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminRemoveCartoonCommand(cartoonId));

    this.logger.log(result.appResult, this.removeCartoon.name);

    this.appNotification.handleHttpResult(result);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(`:cartoonId`)
  @SwaggerDecoratorAdminShowOrHideCartoonById()
  async showOrHideCartoon(
    @Param('cartoonId', ParseIntPatchPipe) cartoonId: number,
    @Body() body: AdminShowOrHiddeCartoonInputDto,
  ): Promise<void> {
    this.logger.log('Execute: show or hide cartoon by admin', this.showOrHideCartoon.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeCartoonCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeCartoonCommand(cartoonId, body));

    this.logger.log(result.appResult, this.showOrHideCartoon.name);

    this.appNotification.handleHttpResult(result);
  }
}

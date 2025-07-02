import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ADMIN_CINEMA_ROUTE } from '@/common/constants/route.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { SwaggerDecoratorAdminGetAllFilms } from '@/admin/api/swagger/admin-get-all-films.swagger.decorator';
import { SwaggerDecoratorAdminUpdateFilmById } from '@/admin/api/swagger/admin-update-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminRemoveFilmById } from '@/admin/api/swagger/admin-remove-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminShowOrHideFilmById } from '@/admin/api/swagger/admin-show-hide-film-by-id.swagger.decorator';
import { SwaggerDecoratorAdminCreateFilm } from '@/admin/api/swagger/admin-add-film.swagger.decorator';
import { CommandBus } from '@nestjs/cqrs';
import { AdminShowOrHiddeFilmCommand } from '@/admin/application/handlers/admin-show-or-hide-film.handler';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { AdminShowOrHiddeFilmInputDto } from '@/admin/api/dtos/input/admin-show-or-hidde-film.input.dto';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

@ApiTags('Admin cinema - films')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(AdminAccessTokenGuard)
@Controller(`${ADMIN_CINEMA_ROUTE.MAIN}/${ADMIN_CINEMA_ROUTE.FILMS}`)
export class AdminCinemaFilmsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(AdminCinemaFilmsController.name);
  }

  // TODO:
  @Get()
  @SwaggerDecoratorAdminGetAllFilms()
  async getAllFilms(): Promise<any> {}

  // TODO:
  @Post()
  @SwaggerDecoratorAdminCreateFilm()
  async addFilm(): Promise<any> {}

  // TODO:
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(`:filmId`)
  @SwaggerDecoratorAdminUpdateFilmById()
  async updateFilm(): Promise<any> {}

  // TODO:
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(`:filmId`)
  @SwaggerDecoratorAdminRemoveFilmById()
  async removeFilm(): Promise<any> {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(`:filmId`)
  @SwaggerDecoratorAdminShowOrHideFilmById()
  async showOrHideFilm(
    @Param('filmId', ParseIntPatchPipe) filmId: number,
    @Body() body: AdminShowOrHiddeFilmInputDto,
  ): Promise<void> {
    this.logger.log('Execute: show or hide film by admin', this.showOrHideFilm.name);

    const result = await this.commandBus.execute<
      AdminShowOrHiddeFilmCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AdminShowOrHiddeFilmCommand(filmId, body));

    this.logger.log(result.appResult, this.showOrHideFilm.name);

    this.appNotification.handleHttpResult(result);
  }
}

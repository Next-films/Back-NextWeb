import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { CommandBus } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminLoginCommand } from '@/admin-auth/application/handlers/admin-login.handler';
import { AdminLoginOutputDto, AdminRefreshTokenPayload } from '@/admin-auth/domain/types';
import {
  COOKIE_REFRESH_TOKEN_ADMIN_OPTIONS,
  COOKIE_REFRESH_TOKEN_NAME,
} from '@/common/constants/cookie-options.constants';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import { Response } from 'express';
import { AdminLoginOutputModel } from '@/admin-auth/api/dtos/output/admin-login.output.model';
import { ADMIN_AUTH_ROUTES } from '@/common/constants/route.constants';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminLogoutCommand } from '@/admin-auth/application/handlers/admin-logout.handler';
import { AdminRefreshTokenGuard } from '@/admin-auth/application/guards/jwt/admin-refresh-token.guard';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { AdminRegisterInputModel } from '@/admin-auth/api/dtos/input/admin-register.input.model';
import { AdminRegisterCommand } from '@/admin-auth/application/handlers/admin-register.handler';
import {
  ErrorFieldExceptionDto,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { AdminMeAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-me-access-token.guard';
import { AdminMeOutputModel } from '@/admin-auth/api/dtos/output/admin-me.output.model';
import { AdminUpdateTokensCommand } from '@/admin-auth/application/handlers/admin-update-tokens.handler';
import { SwaggerDecoratorAdminLogin } from '@/admin-auth/api/swagger/admin-auth-login.swagger.decorator';
import { SwaggerDecoratorAdminLogout } from '@/admin-auth/api/swagger/admin-auth-logout.swagger.decorator';
import { SwaggerDecoratorAdminRegister } from '@/admin-auth/api/swagger/admin-auth-register.swagger.decorator';
import { SwaggerDecoratorAdminUpdateTokens } from '@/admin-auth/api/swagger/admin-auth-update-tokens.swagger.decorator';
import { SwaggerDecoratorAdminMe } from '@/admin-auth/api/swagger/admin-auth-me.swagger.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin - auth')
@Controller(ADMIN_AUTH_ROUTES.MAIN)
export class AdminAuthController {
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly commandBus: CommandBus,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AdminAuthController.name);
  }

  @Post(ADMIN_AUTH_ROUTES.LOGIN)
  @SwaggerDecoratorAdminLogin()
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() body: AdminLoginInputModel,
  ): Promise<AdminLoginOutputModel | void> {
    this.logger.log('Execute: login', this.login.name);

    const result = await this.commandBus.execute<
      AdminLoginCommand,
      AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminLoginCommand(body));

    this.logger.log(result.appResult, this.login.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const { accessToken, refreshToken } = result.data!;

      res.cookie(COOKIE_REFRESH_TOKEN_NAME, refreshToken, COOKIE_REFRESH_TOKEN_ADMIN_OPTIONS);

      return { accessToken };
    }

    this.appNotification.handleHttpResult(result);
  }

  @UseGuards(AdminRefreshTokenGuard)
  @Post(ADMIN_AUTH_ROUTES.LOGOUT)
  @SwaggerDecoratorAdminLogout()
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AdminRefreshTokenPayload,
  ): Promise<void> {
    this.logger.log('Execute: logout', this.logout.name);

    const result = await this.commandBus.execute<AdminLogoutCommand, AppNotificationResult<null>>(
      new AdminLogoutCommand(user.deviceId),
    );

    this.logger.log(result.appResult, this.logout.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      res.clearCookie(COOKIE_REFRESH_TOKEN_NAME);
    }

    this.appNotification.handleHttpResult(result);
  }

  @UseGuards(AdminAccessTokenGuard)
  @Post(ADMIN_AUTH_ROUTES.REGISTRATION)
  @SwaggerDecoratorAdminRegister()
  async register(@Body() body: AdminRegisterInputModel): Promise<void> {
    this.logger.log('Execute: register admin', this.register.name);

    const result = await this.commandBus.execute<
      AdminRegisterCommand,
      AppNotificationResult<null, ValidationErrorsDto | null>
    >(new AdminRegisterCommand(body));

    this.logger.log(result.appResult, this.register.name);

    this.appNotification.handleHttpResult(result);
  }

  @UseGuards(AdminRefreshTokenGuard)
  @Post(ADMIN_AUTH_ROUTES.UPDATE_TOKENS)
  @SwaggerDecoratorAdminUpdateTokens()
  async updateTokensPair(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AdminRefreshTokenPayload,
  ): Promise<AdminLoginOutputModel | void> {
    this.logger.log('Execute: update tokens pairs', this.updateTokensPair.name);
    const result = await this.commandBus.execute<
      AdminUpdateTokensCommand,
      AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>
    >(new AdminUpdateTokensCommand(user));

    this.logger.log(result.appResult, this.updateTokensPair.name);

    if (result.appResult === AppNotificationResultEnum.Success) {
      const { accessToken, refreshToken } = result.data!;

      res.cookie(COOKIE_REFRESH_TOKEN_NAME, refreshToken, COOKIE_REFRESH_TOKEN_ADMIN_OPTIONS);

      return { accessToken };
    }

    this.appNotification.handleHttpResult(result);
  }

  @UseGuards(AdminMeAccessTokenGuard)
  @Get(ADMIN_AUTH_ROUTES.ME)
  @SwaggerDecoratorAdminMe()
  async me(@CurrentUser() user: AdminMeOutputModel): Promise<AdminMeOutputModel> {
    this.logger.debug('Execute: get info about current user', this.me.name);
    return user;
  }
}

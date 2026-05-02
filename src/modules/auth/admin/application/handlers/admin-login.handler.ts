import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { AdminLoginInputModel } from '@/admin-auth/api/dtos/input/admin-login.input.model';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import {
  AdminAccessTokenPayload,
  AdminLoginOutputDto,
  AdminRefreshTokenPayload,
} from '@/admin-auth/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { AdminAuthRepository } from '@/admin-auth/infrastructure/admin-auth.repository';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';
import { Inject } from '@nestjs/common';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { JWTTokenOptions } from '@/jwt-module/domain/types';
import { JwtMService } from '@/jwt-module/application/jwt.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export class AdminLoginCommand implements ICommand {
  constructor(public inputModel: AdminLoginInputModel) {}
}

@CommandHandler(AdminLoginCommand)
export class AdminLoginHandler
  implements
    ICommandHandler<
      AdminLoginCommand,
      AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>
    >
{
  private readonly allowDevDirectLogin: boolean;
  private readonly devDirectLoginToken: string;
  private readonly devDirectLoginPassword: string;
  private readonly adminEmail: string;
  private readonly adminUsername: string;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiredAt: string;
  private readonly refreshTokenExpiredAt: string;
  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtMService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(AdminSession.name) private readonly adminSessionEntity: typeof AdminSession,
    private readonly adminAuthSessionRepository: AdminAuthSessionRepository,
  ) {
    this.logger.setContext(AdminLoginCommand.name);
    const businessRules = this.configService.get('businessRulesSettings', { infer: true });
    const environmentSettings = this.configService.get('environmentSettings', { infer: true });
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.accessTokenExpiredAt = businessRules.ADMIN_ACCESS_JWT_EXPIRED_TIME;
    this.refreshTokenExpiredAt = businessRules.ADMIN_REFRESH_JWT_EXPIRED_TIME;

    this.accessTokenSecret = apiSettings.ADMIN_ACCESS_JWT_SECRET;
    this.refreshTokenSecret = apiSettings.ADMIN_REFRESH_JWT_SECRET;
    this.allowDevDirectLogin =
      environmentSettings.isDevelopment || businessRules.ADMIN_DEV_DIRECT_LOGIN_ENABLED;
    this.devDirectLoginToken = 'DEV_LOCAL_LOGIN';
    this.devDirectLoginPassword = 'admin';
    this.adminEmail = apiSettings.ADMIN_EMAIL;
    this.adminUsername = apiSettings.ADMIN_USERNAME;
  }
  async execute(
    command: AdminLoginCommand,
  ): Promise<AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log('Login admin command', this.execute.name);

    const { inputModel } = command;
    const { password, token } = inputModel;
    try {
      await this.adminAuthRepository.deleteExpiredPasswordSetupAdmins();

      const useDevDirectLogin = this.allowDevDirectLogin && token === this.devDirectLoginToken;
      const admin = useDevDirectLogin
        ? await this.adminAuthRepository.getAdminByEmailOrUsername(
            this.adminEmail,
            this.adminUsername,
          )
        : await this.adminAuthRepository.getAdminByAuthToken(token);

      if (!admin)
        return this.appNotification.unauthorized({
          field: 'token_password',
          message: 'Login or password not correct',
          errorKey: EXCEPTION_KEYS_ENUM.LOGIN_OR_PASSWORD_NOT_CORRECT,
        });

      if (!admin.isActive || (!admin.password && !useDevDirectLogin))
        return this.appNotification.unauthorized({
          field: 'token_password',
          message: 'Login or password not correct',
          errorKey: EXCEPTION_KEYS_ENUM.LOGIN_OR_PASSWORD_NOT_CORRECT,
        });

      if (
        !useDevDirectLogin &&
        (!admin.telegramAuthTokenExpAt || admin.telegramAuthTokenExpAt.getTime() <= Date.now())
      )
        return this.appNotification.unauthorized({
          field: 'token_password',
          message: 'Login or password not correct',
          errorKey: EXCEPTION_KEYS_ENUM.LOGIN_OR_PASSWORD_NOT_CORRECT,
        });

      const verifyPass = useDevDirectLogin
        ? password === this.devDirectLoginPassword ||
          (admin.password ? await this.bcryptService.comparePass(password, admin.password) : false)
        : admin.password
        ? await this.bcryptService.comparePass(password, admin.password)
        : false;

      if (!verifyPass)
        return this.appNotification.unauthorized({
          field: 'token_password',
          message: 'Login or password not correct',
          errorKey: EXCEPTION_KEYS_ENUM.LOGIN_OR_PASSWORD_NOT_CORRECT,
        });

      if (!useDevDirectLogin) {
        admin.clearTelegramAuthToken();
        await this.adminAuthRepository.save(admin);
      }

      const { refreshTokenOptions, refreshTokenPayload, accessTokenPayload, accessTokenOptions } =
        this.getTokensData(admin.id);

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.createAccessTokenJWT(accessTokenPayload, accessTokenOptions),
        this.jwtService.createRefreshTokenJWT(refreshTokenPayload, refreshTokenOptions),
      ]);

      const { deviceId } = refreshTokenPayload;
      const { iat, exp } = (await this.jwtService.verifyRefreshToken(
        refreshToken,
        this.refreshTokenSecret,
      )) as AdminRefreshTokenPayload;

      const issueAt = new Date(iat * 1000);
      const expAt = new Date(exp * 1000);
      const session = this.adminSessionEntity.create(admin.id, deviceId, issueAt, expAt);

      await this.adminAuthSessionRepository.save(session);
      return this.appNotification.success({ accessToken, refreshToken, isPasswordSet: true });
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private getTokensData(adminId: number): {
    accessTokenPayload: Omit<AdminAccessTokenPayload, 'exp' | 'iat'>;
    accessTokenOptions: JWTTokenOptions;
    refreshTokenPayload: Omit<AdminRefreshTokenPayload, 'exp' | 'iat'>;
    refreshTokenOptions: JWTTokenOptions;
  } {
    const accessTokenPayload: Omit<AdminAccessTokenPayload, 'exp' | 'iat'> = {
      id: adminId,
    };

    const accessTokenOptions: JWTTokenOptions = {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiredAt,
    };

    const refreshTokenPayload: Omit<AdminRefreshTokenPayload, 'exp' | 'iat'> = {
      id: adminId,
      deviceId: this.jwtService.generateDeviceId(adminId),
    };

    const refreshTokenOptions: JWTTokenOptions = {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiredAt,
    };

    return { accessTokenPayload, accessTokenOptions, refreshTokenPayload, refreshTokenOptions };
  }
}

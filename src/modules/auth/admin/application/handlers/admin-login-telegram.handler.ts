import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { Inject } from '@nestjs/common';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { JWTTokenOptions } from '@/jwt-module/domain/types';
import { JwtMService } from '@/jwt-module/application/jwt.service';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';

export class AdminTelegramLoginCommand implements ICommand {
  constructor(public readonly token: string) {}
}

@CommandHandler(AdminTelegramLoginCommand)
export class AdminTelegramLoginHandler
  implements
    ICommandHandler<
      AdminTelegramLoginCommand,
      AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>
    >
{
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiredAt: string;
  private readonly refreshTokenExpiredAt: string;

  constructor(
    private readonly appNotification: ApplicationNotification,
    private readonly logger: LoggerService,
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly jwtService: JwtMService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    @Inject(AdminSession.name) private readonly adminSessionEntity: typeof AdminSession,
    private readonly adminAuthSessionRepository: AdminAuthSessionRepository,
  ) {
    this.logger.setContext(AdminTelegramLoginHandler.name);
    const businessRules = this.configService.get('businessRulesSettings', { infer: true });
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.accessTokenExpiredAt = businessRules.ADMIN_ACCESS_JWT_EXPIRED_TIME;
    this.refreshTokenExpiredAt = businessRules.ADMIN_REFRESH_JWT_EXPIRED_TIME;

    this.accessTokenSecret = apiSettings.ADMIN_ACCESS_JWT_SECRET;
    this.refreshTokenSecret = apiSettings.ADMIN_REFRESH_JWT_SECRET;
  }

  async execute(
    command: AdminTelegramLoginCommand,
  ): Promise<AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.log('Telegram login admin command', this.execute.name);

    const { token } = command;
    const maskedToken = `${token.slice(0, 8)}...`;

    try {
      await this.adminAuthRepository.deleteExpiredPasswordSetupAdmins();

      const admin = await this.adminAuthRepository.getAdminByAuthToken(token);

      if (!admin) {
        this.logger.warn(`Telegram login rejected: reason=token_not_found, token=${maskedToken}`);
        return this.appNotification.unauthorized({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });
      }

      if (!admin.isActive) {
        this.logger.warn(
          `Telegram login rejected: reason=admin_inactive, adminId=${admin.id}, token=${maskedToken}`,
        );
        return this.appNotification.unauthorized({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });
      }

      if (!admin.adminTelegram?.telegramId) {
        this.logger.warn(
          `Telegram login rejected: reason=telegram_missing, adminId=${admin.id}, token=${maskedToken}`,
        );
        return this.appNotification.unauthorized({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });
      }

      if (!admin.telegramAuthTokenExpAt || admin.telegramAuthTokenExpAt.getTime() <= Date.now()) {
        this.logger.warn(
          `Telegram login rejected: reason=token_expired, adminId=${admin.id}, expAt=${
            admin.telegramAuthTokenExpAt?.toISOString() || 'null'
          }, token=${maskedToken}`,
        );
        return this.appNotification.unauthorized({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });
      }

      admin.clearTelegramAuthToken();
      await this.adminAuthRepository.save(admin);

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

      return this.appNotification.success({
        accessToken,
        refreshToken,
        isPasswordSet: !!admin.password,
      });
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

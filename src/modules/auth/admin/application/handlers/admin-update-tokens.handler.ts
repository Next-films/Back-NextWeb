import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  AdminAccessTokenPayload,
  AdminLoginOutputDto,
  AdminRefreshTokenPayload,
} from '@/admin-auth/domain/types';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { JwtMService } from '@/jwt-module/application/jwt.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { AdminAuthSessionRepository } from '@/admin-auth/infrastructure/admin-auth-session.repository';
import { JWTTokenOptions } from '@/jwt-module/domain/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

export class AdminUpdateTokensCommand implements ICommand {
  constructor(public admin: AdminRefreshTokenPayload) {}
}

@CommandHandler(AdminUpdateTokensCommand)
export class AdminUpdateTokensHandler
  implements
    ICommandHandler<
      AdminUpdateTokensCommand,
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
    private readonly jwtService: JwtMService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly adminAuthSessionRepository: AdminAuthSessionRepository,
  ) {
    this.logger.setContext(AdminUpdateTokensHandler.name);

    const businessRules = this.configService.get('businessRulesSettings', { infer: true });
    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.accessTokenExpiredAt = businessRules.ADMIN_ACCESS_JWT_EXPIRED_TIME;
    this.refreshTokenExpiredAt = businessRules.ADMIN_REFRESH_JWT_EXPIRED_TIME;

    this.accessTokenSecret = apiSettings.ADMIN_ACCESS_JWT_SECRET;
    this.refreshTokenSecret = apiSettings.ADMIN_REFRESH_JWT_SECRET;
  }

  async execute(
    command: AdminUpdateTokensCommand,
  ): Promise<AppNotificationResult<AdminLoginOutputDto, ErrorFieldExceptionDto | null>> {
    this.logger.debug('Update admin tokens pair command', this.execute.name);
    const { admin } = command;
    const { deviceId, id } = admin;
    try {
      const session = await this.adminAuthSessionRepository.getSessionByDeviceId(deviceId);

      if (!session)
        return this.appNotification.unauthorized({
          message: 'Unauthorized',
          field: 'token',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        });

      const { refreshTokenOptions, refreshTokenPayload, accessTokenPayload, accessTokenOptions } =
        this.getTokensData(id);

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.createAccessTokenJWT(accessTokenPayload, accessTokenOptions),
        this.jwtService.createRefreshTokenJWT(refreshTokenPayload, refreshTokenOptions),
      ]);

      const {
        exp,
        iat,
        deviceId: newDeviceId,
      } = (await this.jwtService.verifyRefreshToken(
        newRefreshToken,
        this.refreshTokenSecret,
      )) as AdminRefreshTokenPayload;

      session.updateSession(newDeviceId, iat, exp);

      await this.adminAuthSessionRepository.save(session);

      return this.appNotification.success({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
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

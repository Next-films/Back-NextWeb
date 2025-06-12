import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiAuthRepository } from '@/external-auth/infrastructure/external-api-auth.repository';
import { JwtMService } from '@/jwt-module/application/jwt.service';
import { JWTTokenOptions } from '@/jwt-module/domain/types';
import {
  ApiCinemaAccessTokenPayload,
  ExternalApiTokenExpAtEnum,
} from '@/external-auth/domain/types';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { JwtExpirationUtil } from '@/common/utils/jwt-expiration.util';
import { ExternalApiTokenCreateOutputDto } from '@/admin/api/dtos/output/external-api-token-create.output.dto';
import { ExternalApiTokenUpdateInputDto } from '@/admin/api/dtos/input/external-api-token-update.input.dto';

export class AdminUpdateExternalApiTokenCommand implements ICommand {
  constructor(
    public tokenId: number,
    public inputDto: ExternalApiTokenUpdateInputDto,
  ) {}
}

@CommandHandler(AdminUpdateExternalApiTokenCommand)
export class AdminUpdateExternalApiTokenCommandHandler
  implements
    ICommandHandler<
      AdminUpdateExternalApiTokenCommand,
      AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
    >
{
  private readonly accessTokenSecret: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly externalApiAuthRepository: ExternalApiAuthRepository,
    private readonly jwtService: JwtMService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly jwtExpirationUtil: JwtExpirationUtil,
  ) {
    this.logger.setContext(AdminUpdateExternalApiTokenCommandHandler.name);

    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.accessTokenSecret = apiSettings.EXTERNAL_ACCESS_JWT_SECRET;
  }
  async execute(
    command: AdminUpdateExternalApiTokenCommand,
  ): Promise<
    AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
  > {
    const { tokenId, inputDto } = command;
    const { expAt } = inputDto;
    this.logger.log(`Update external api token command`, this.execute.name);
    try {
      const token = await this.externalApiAuthRepository.getTokenById(tokenId);

      if (!token)
        return this.appNotification.notFound({
          field: 'tokenId',
          message: 'Token not found',
          errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_NOT_FOUND,
        });

      const { accessTokenPayload, accessTokenOptions } = this.getTokensData(token.name, expAt);
      const accessToken = await this.jwtService.createAccessTokenJWT(
        accessTokenPayload,
        accessTokenOptions,
      );

      const [header, payload] = accessToken.split('.');

      token.update(`${header}.${payload}`, expAt);

      await this.externalApiAuthRepository.save(token);

      return this.appNotification.success({ token: accessToken });
    } catch (e) {
      this.logger.error(e, this.execute.name);
      return this.appNotification.internalServerError();
    }
  }

  private getTokensData(
    name: string,
    expAt: ExternalApiTokenExpAtEnum,
  ): {
    accessTokenPayload: Omit<ApiCinemaAccessTokenPayload, 'exp' | 'iat'>;
    accessTokenOptions: JWTTokenOptions;
  } {
    const accessTokenPayload: Omit<ApiCinemaAccessTokenPayload, 'exp' | 'iat'> = {
      name,
    };

    const exp = this.jwtExpirationUtil.getJwtExp(expAt);
    const accessTokenOptions: JWTTokenOptions = {
      secret: this.accessTokenSecret,
      ...(exp ? { expiresIn: exp } : {}),
    };

    return { accessTokenPayload, accessTokenOptions };
  }
}

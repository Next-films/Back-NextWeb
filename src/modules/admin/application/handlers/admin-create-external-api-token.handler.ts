import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { Inject } from '@nestjs/common';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { ExternalApiAuthRepository } from '@/external-auth/infrastructure/external-api-auth.repository';
import { ExternalApiTokenCreateInputDto } from '@/admin/api/dtos/input/external-api-token-create.input.dto';
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

export class AdminCreateExternalApiTokenCommand implements ICommand {
  constructor(public inputDto: ExternalApiTokenCreateInputDto) {}
}

@CommandHandler(AdminCreateExternalApiTokenCommand)
export class AdminCreateExternalApiTokenCommandHandler
  implements
    ICommandHandler<
      AdminCreateExternalApiTokenCommand,
      AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
    >
{
  private readonly accessTokenSecret: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    @Inject(ExternalApiAuth.name) private readonly externalApiEntity: typeof ExternalApiAuth,
    private readonly externalApiAuthRepository: ExternalApiAuthRepository,
    private readonly jwtService: JwtMService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly jwtExpirationUtil: JwtExpirationUtil,
  ) {
    this.logger.setContext(AdminCreateExternalApiTokenCommandHandler.name);

    const apiSettings = this.configService.get('apiSettings', { infer: true });

    this.accessTokenSecret = apiSettings.EXTERNAL_ACCESS_JWT_SECRET;
  }
  async execute(
    command: AdminCreateExternalApiTokenCommand,
  ): Promise<
    AppNotificationResult<ExternalApiTokenCreateOutputDto, ErrorFieldExceptionDto | null>
  > {
    const { inputDto } = command;
    const { name, expAt } = inputDto;
    this.logger.log(`Create new external api token command`, this.execute.name);
    try {
      const token = await this.externalApiAuthRepository.getTokenByName(name);

      if (token)
        return this.appNotification.badRequest({
          field: 'name',
          message: 'The token is exists',
          errorKey: EXCEPTION_KEYS_ENUM.EXTERNAL_API_TOKEN_ALREADY_EXIST,
        });

      const newToken = this.externalApiEntity.create(name, expAt);

      const { accessTokenPayload, accessTokenOptions } = this.getTokensData(name, expAt);
      const accessToken = await this.jwtService.createAccessTokenJWT(
        accessTokenPayload,
        accessTokenOptions,
      );

      const [header, payload] = accessToken.split('.');

      newToken.update(`${header}.${payload}`);

      await this.externalApiAuthRepository.save(newToken);

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

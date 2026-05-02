import { EnvironmentVariable } from '@/settings/configuration';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class BusinessRulesSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsString()
  ADMIN_ACCESS_JWT_EXPIRED_TIME: string = this.environmentVariables.ADMIN_ACCESS_JWT_EXPIRED_TIME;

  @IsString()
  ADMIN_REFRESH_JWT_EXPIRED_TIME: string = this.environmentVariables.ADMIN_REFRESH_JWT_EXPIRED_TIME;

  @IsNumber()
  ADMIN_HASH_SALT_ROUND: number = Number.parseInt(this.environmentVariables.ADMIN_HASH_SALT_ROUND);

  @IsString()
  MODERATION_MOVIE_FRONT_URL: string = this.environmentVariables.MODERATION_MOVIE_FRONT_URL;

  @IsBoolean()
  IS_RMQ_ENABLE: boolean = this.environmentVariables.IS_RMQ_ENABLE === 'true';

  @IsBoolean()
  ADMIN_DEV_DIRECT_LOGIN_ENABLED: boolean =
    this.environmentVariables.ADMIN_DEV_DIRECT_LOGIN_ENABLED === 'true';
}

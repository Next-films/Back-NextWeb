import { EnvironmentVariable } from '@/settings/configuration';
import { IsString } from 'class-validator';

export class BusinessRulesSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsString()
  TEST: string = this.environmentVariables.TEST || 'OK';
  // @IsString()
  // ADMIN_ACCESS_JWT_EXPIRED_TIME: string = this.environmentVariables.ADMIN_ACCESS_JWT_EXPIRED_TIME;
  //
  // @IsString()
  // ADMIN_REFRESH_JWT_EXPIRED_TIME: string = this.environmentVariables.ADMIN_REFRESH_JWT_EXPIRED_TIME;
}

import { EnvironmentVariable } from '@/settings/configuration';
import {IsNumber, IsString} from 'class-validator';

export class BusinessRulesSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsString()
  ADMIN_ACCESS_JWT_EXPIRED_TIME : string = this.environmentVariables.ADMIN_ACCESS_JWT_EXPIRED_TIME

  @IsString()
  ADMIN_REFRESH_JWT_EXPIRED_TIME: string = this.environmentVariables.ADMIN_REFRESH_JWT_EXPIRED_TIME

  @IsNumber()
  ADMIN_HASH_SALT_ROUND: number = Number.parseInt(this.environmentVariables.ADMIN_HASH_SALT_ROUND)
}

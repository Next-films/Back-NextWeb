import { IsNumber, IsString } from 'class-validator';
import { EnvironmentVariable } from '@/settings/configuration';

export class ApiSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsNumber()
  PORT: number = Number.parseInt(this.environmentVariables.PORT);

  @IsString()
  GLOBAL_PREFIX: string = this.environmentVariables.GLOBAL_PREFIX;

  @IsString()
  FRIEND_FRONT_URLS: string = this.environmentVariables.FRIEND_FRONT_URLS;

  @IsString()
  ADMIN_EMAIL:  string = this.environmentVariables.ADMIN_EMAIL;

  @IsString()
  ADMIN_USERNAME: string = this.environmentVariables.ADMIN_USERNAME;

  @IsString()
  ADMIN_PASSWORD: string = this.environmentVariables.ADMIN_PASSWORD;

  @IsString()
  ADMIN_ACCESS_JWT_SECRET: string = this.environmentVariables.ADMIN_ACCESS_JWT_SECRET;

  @IsString()
  ADMIN_REFRESH_JWT_SECRET: string = this.environmentVariables.ADMIN_REFRESH_JWT_SECRET;
}

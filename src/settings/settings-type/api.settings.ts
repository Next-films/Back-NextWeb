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
}

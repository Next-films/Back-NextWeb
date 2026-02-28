import { IsString } from 'class-validator';
import { EnvironmentVariable } from '@/settings/configuration';

export class SwaggerSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsString()
  SWAGGER_USER: string = this.environmentVariables.SWAGGER_USER;

  @IsString()
  SWAGGER_PATH: string = this.environmentVariables.SWAGGER_PATH;

  @IsString()
  SWAGGER_PASSWORD: string = this.environmentVariables.SWAGGER_PASSWORD;

  @IsString()
  SWAGGER_SERVERS_URLS: string = this.environmentVariables.SWAGGER_SERVERS_URLS;
}

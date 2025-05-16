import { EnvironmentVariable } from '@/settings/configuration';
import { IsString } from 'class-validator';

export class LoggerSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsString()
  LOGGER_HOST: string = this.environmentVariables.LOGGER_HOST;
}

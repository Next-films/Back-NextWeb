import { EnvironmentVariable } from '@/settings/configuration';
import {IsBoolean, IsString} from 'class-validator';

export class LoggerSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}

  @IsBoolean()
  LOGGING: boolean =  this.environmentVariables.LOGGING === 'true'

  @IsString()
  LOGGER_HOST: string = this.environmentVariables.LOGGER_HOST;
}

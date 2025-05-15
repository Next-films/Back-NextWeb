import { EnvironmentVariable } from '@/settings/configuration';
import { IsBoolean } from 'class-validator';

export class DatabaseSettings {
  constructor(private environmentVariables: EnvironmentVariable) {}
  // @IsString()
  // POSTGRES_HOST: string = this.environmentVariables.POSTGRES_HOST;
  //
  // @IsString()
  // POSTGRES_DB: string = this.environmentVariables.POSTGRES_DB;
  //
  // @IsString()
  // POSTGRES_USER: string = this.environmentVariables.POSTGRES_USER;
  //
  // @IsString()
  // POSTGRES_PASSWORD: string = this.environmentVariables.POSTGRES_PASSWORD;
  //
  // @IsNumber()
  // POSTGRES_PORT: number = Number.parseInt(this.environmentVariables.POSTGRES_PORT);
  //
  // @IsBoolean()
  // SYNCHRONIZE_DB: boolean = this.environmentVariables.SYNCHRONIZE_DB === 'true';
  //
  @IsBoolean()
  LOGGING_DB: boolean = this.environmentVariables.LOGGING_DB === 'true';
}

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
  ADMIN_EMAIL: string = this.environmentVariables.ADMIN_EMAIL;

  @IsString()
  ADMIN_USERNAME: string = this.environmentVariables.ADMIN_USERNAME;

  @IsString()
  ADMIN_PASSWORD: string = this.environmentVariables.ADMIN_PASSWORD;

  @IsString()
  ADMIN_ACCESS_JWT_SECRET: string = this.environmentVariables.ADMIN_ACCESS_JWT_SECRET;

  @IsString()
  ADMIN_REFRESH_JWT_SECRET: string = this.environmentVariables.ADMIN_REFRESH_JWT_SECRET;

  @IsString()
  EXTERNAL_ACCESS_JWT_SECRET: string = this.environmentVariables.EXTERNAL_ACCESS_JWT_SECRET;

  @IsString()
  EXTERNAL_TOKEN: string = this.environmentVariables.EXTERNAL_TOKEN;

  @IsString()
  EXTERNAL_TOKEN_NAME: string = this.environmentVariables.EXTERNAL_TOKEN_NAME;

  @IsString()
  RMQ_URI: string = this.environmentVariables.RMQ_URI;

  @IsString()
  DOWNLOAD_SERVICE_RMQ_QUEUE_NAME: string =
    this.environmentVariables.DOWNLOAD_SERVICE_RMQ_QUEUE_NAME;

  @IsString()
  CINEMA_SERVICE_RMQ_QUEUE_NAME: string = this.environmentVariables.CINEMA_SERVICE_RMQ_QUEUE_NAME;

  @IsString()
  KINOPOISK_API_URL: string = this.environmentVariables.KINOPOISK_API_URL;

  @IsString()
  KINOPOISK_API_TOKEN: string = this.environmentVariables.KINOPOISK_API_TOKEN;

  @IsString()
  DOWNLOAD_SERVICE_TOKEN: string = this.environmentVariables.DOWNLOAD_SERVICE_TOKEN;

  @IsString()
  TELEGRAM_ADMIN_BOT_TOKEN: string = this.environmentVariables.TELEGRAM_ADMIN_BOT_TOKEN;

  @IsString()
  MAIN_TELEGRAM_GROUP_CHAT_ID: string = this.environmentVariables.MAIN_TELEGRAM_GROUP_CHAT_ID;

  @IsString()
  NEW_FILM_TELEGRAM_THREAD_ID: string = this.environmentVariables.NEW_FILM_TELEGRAM_THREAD_ID;

  @IsString()
  ADMIN_TG_ID: string = this.environmentVariables.ADMIN_TG_ID;

  @IsString()
  ADMIN_TG_USERNAME: string = this.environmentVariables.ADMIN_TG_USERNAME;
}

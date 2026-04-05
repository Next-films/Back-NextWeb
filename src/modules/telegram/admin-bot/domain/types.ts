import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';

export type TelegramIncomingMessage = {
  from?: {
    id?: number | null;
    username?: string | null;
  } | null;
  text?: string;
  chat?: {
    id: number | string;
    type?: string;
  };
};

export class BotCommandsDto {
  tgMessage: TelegramIncomingMessage;
}

export class BotSendMessagePayloadDto {
  chatId: number | string;
  template: ADMIN_BOT_TEMPLATES_NAME_ENUM;
  threadId?: number;
}

export class BotNewMovieForModerationPayloadDto {
  title: string;
  originalTitle: string;
  releaseDate: string;
  duration: string;
  link: string;
  movieId: number;
  type: string;
}

export class BotAdminAcceptModerationPayloadDto {
  telegramUsername: string;
  acceptAt: string;
  title: string;
  movieId: number;
  type: string;
}

export class BotAdminCanceledModerationPayloadDto {
  telegramUsername: string;
  rejectAt: string;
  title: string;
  movieId: number;
  type: string;
}

export class BotAdminFinishedModerationPayloadDto {
  telegramUsername: string;
  finishedAt: string;
  title: string;
  movieId: number;
  type: string;
}

export class BotMovieDownloadedWithoutModerationPayloadDto {
  title: string;
  movieId: number;
  type: string;
}

export interface IAdminBotNotificationCancelModerationStrategy {
  getMovie: (movieId: number) => Promise<MovieEntity | null>;
}

export interface IAdminBotNotificationFinishedModerationStrategy {
  getMovie: (movieId: number) => Promise<MovieEntity | null>;
}

export interface IAdminBotNotificationAcceptModerationStrategy {
  getTask: (taskId: number) => Promise<ModerationMovieEntity | null>;
}

export interface IAdminBotNotificationNewModerationStrategy {
  getTask: (
    taskId: number,
  ) => Promise<ModerationFilmEntity | ModerationCartoonEntity | ModerationSerialEntity | null>;
}

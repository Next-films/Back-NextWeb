import { INestApplication } from '@nestjs/common';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ModerationFilmRepository } from '@/moderation-movie/infrastructure/moderation-film.repository';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';

import { TestService } from '../../test.service';
import { createAdminCinemaMovieFactory } from '../admin-cinema-movie-factory.util';

export type AdminCinemaFilmsSuiteContext = {
  getApp: () => INestApplication;
  getTestService: () => TestService;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminCinemaFilmsUrl: () => string;
  createMovieFactory: () => ReturnType<typeof createAdminCinemaMovieFactory>;
  getModerationFilmRepository: () => ModerationFilmRepository;
  getTelegramAdminBotService: () => TelegramAdminBotService;
};

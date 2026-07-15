import { INestApplication } from '@nestjs/common';

import { AdminLoginOutputDto } from '@/admin-auth/domain/types';
import { ModerationCartoonRepository } from '@/moderation-movie/infrastructure/moderation-cartoon.repository';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';

import { TestService } from '../../test.service';
import { createAdminCinemaMovieFactory } from '../admin-cinema-movie-factory.util';

export type AdminCinemaCartoonsSuiteContext = {
  getApp: () => INestApplication;
  getTestService: () => TestService;
  getLoginByMainAdmin: () => () => Promise<AdminLoginOutputDto>;
  getAdminCinemaCartoonsUrl: () => string;
  createMovieFactory: () => ReturnType<typeof createAdminCinemaMovieFactory>;
  getModerationCartoonRepository: () => ModerationCartoonRepository;
  getTelegramAdminBotService: () => TelegramAdminBotService;
};

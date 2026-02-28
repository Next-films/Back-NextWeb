import { TelegramAdminBotStartCommand } from '@/telegram/admin-bot/application/handlers/bot-start.handler';

export type BotCommandInfoConstantsType<T extends string = string> = {
  [K in T]: {
    COMMAND: string;
    DESCRIPTION: string;
  };
};

export const BOT_COMMANDS_INFO: BotCommandInfoConstantsType = {
  START: {
    COMMAND: '/start',
    DESCRIPTION: '',
  },
} as const;

export const ADMIN_TG_BOT_COMMAND = {
  [BOT_COMMANDS_INFO.START.COMMAND]: TelegramAdminBotStartCommand,
};

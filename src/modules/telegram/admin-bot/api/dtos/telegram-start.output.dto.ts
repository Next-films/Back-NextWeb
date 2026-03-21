import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';

export class TelegramStartOutputDto {
  template: ADMIN_BOT_TEMPLATES_NAME_ENUM;
  data?: Record<string, unknown>;
  parseMode: 'HTML';
}

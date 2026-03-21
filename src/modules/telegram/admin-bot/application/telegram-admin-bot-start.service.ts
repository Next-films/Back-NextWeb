import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { ConfigurationType } from '@/settings/configuration';

export type TelegramAdminBotStartResult = {
  template: ADMIN_BOT_TEMPLATES_NAME_ENUM;
  data?: {
    loginUrl: string;
    isPasswordSet: boolean;
    username: string | null;
  };
};

@Injectable()
export class TelegramAdminBotStartService {
  constructor(
    private readonly logger: LoggerService,
    private readonly adminRepository: AdminRepository,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(TelegramAdminBotStartService.name);
  }

  async processStart(
    chatId: number,
    username?: string | null,
  ): Promise<TelegramAdminBotStartResult> {
    await this.adminRepository.deleteExpiredPasswordSetupAdmins();

    const userById = await this.adminRepository.getAdminByTelegramId(String(chatId));
    const userByUsername =
      !userById && username
        ? await this.adminRepository.getAdminByTelegramUsername(username)
        : null;

    const user = userById || userByUsername;

    if (!user) {
      this.logger.log('User not found', this.processStart.name);
      return { template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU };
    }

    const chatIdString = String(chatId);
    const isPendingTelegramId = user.adminTelegram.telegramId.startsWith('pending:');

    if (isPendingTelegramId) {
      this.logger.log(`Bind telegram id to invited user: ${chatId}`, this.processStart.name);
      user.setTelegramIdentity(chatIdString, username || undefined);
    } else if (user.adminTelegram.telegramId !== chatIdString) {
      this.logger.warn(`Telegram id mismatch for user: ${chatId}`, this.processStart.name);
      return { template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU };
    } else if (username && user.adminTelegram.username !== username) {
      user.updateTelegramInfo(username);
    }

    const authToken = randomUUID();
    const tokenExpAt = new Date(Date.now() + 15 * 60 * 1000);
    user.issueTelegramAuthToken(authToken, tokenExpAt);
    await this.adminRepository.save(user);

    return {
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.LOGIN_LINK,
      data: this.getPayloadData(authToken, user.password !== null, user.adminTelegram.username),
    };
  }

  private getPayloadData(
    authToken: string,
    isPasswordSet: boolean,
    username: string | null,
  ): {
    loginUrl: string;
    isPasswordSet: boolean;
    username: string | null;
  } {
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const adminBaseUrl = apiSettings.ADMIN_PANEL_URL;

    const parsed = new URL(adminBaseUrl);
    parsed.pathname = '/login';
    parsed.searchParams.set('tgAuthToken', authToken);
    parsed.searchParams.set('flow', isPasswordSet ? 'login' : 'registration');

    return {
      loginUrl: parsed.toString(),
      isPasswordSet,
      username,
    };
  }
}

import { forwardRef, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { BotCommandsDto, BotSendMessagePayloadDto } from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

export class TelegramAdminBotStartCommand implements ICommand {
  constructor(public payload: BotCommandsDto) {}
}

@CommandHandler(TelegramAdminBotStartCommand)
export class TelegramAdminBotStartCommandHandler
  implements ICommandHandler<TelegramAdminBotStartCommand, void>
{
  constructor(
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => TelegramAdminBotService))
    private readonly botService: TelegramAdminBotService,
    private readonly adminRepository: AdminRepository,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(TelegramAdminBotStartCommandHandler.name);
  }

  async execute(command: TelegramAdminBotStartCommand): Promise<void> {
    const { tgMessage } = command.payload;
    const { from } = tgMessage;
    const chatId = from?.id;
    const username = from?.username;

    this.logger.log(`Bot start command: ${chatId}`, this.execute.name);

    if (!chatId) {
      this.logger.log(`Undefined chat id: ${chatId}`, this.execute.name);

      return;
    }

    const payload: BotSendMessagePayloadDto = {
      chatId,
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.LOGIN_LINK,
    };

    try {
      await this.adminRepository.deleteExpiredPasswordSetupAdmins();

      const userById = await this.adminRepository.getAdminByTelegramId(String(chatId));
      const userByUsername =
        !userById && username
          ? await this.adminRepository.getAdminByTelegramUsername(username)
          : null;

      const user = userById || userByUsername;

      if (!user) {
        this.logger.log('User not found', this.execute.name);
        await this.botService.sendHtmlMessage({
          ...payload,
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
        });

        return;
      }

      const chatIdString = String(chatId);
      const isPendingTelegramId = user.adminTelegram.telegramId.startsWith('pending:');

      if (isPendingTelegramId) {
        this.logger.log(`Bind telegram id to invited user: ${chatId}`, this.execute.name);
        user.setTelegramIdentity(chatIdString, username || undefined);
      } else if (user.adminTelegram.telegramId !== chatIdString) {
        this.logger.warn(`Telegram id mismatch for user: ${chatId}`, this.execute.name);
        await this.botService.sendHtmlMessage({
          chatId,
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
        });
        return;
      } else if (username && user.adminTelegram.username !== username) {
        user.updateTelegramInfo(username);
      }

      const authToken = randomUUID();
      const tokenExpAt = new Date(Date.now() + 15 * 60 * 1000);
      user.issueTelegramAuthToken(authToken, tokenExpAt);
      await this.adminRepository.save(user);

      await this.botService.sendHtmlMessage(
        payload,
        this.getPayloadData(authToken, user.password !== null, user.adminTelegram.username),
      );
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
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

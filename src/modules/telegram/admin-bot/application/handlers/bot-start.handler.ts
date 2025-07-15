import { forwardRef, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { BotCommandsDto, BotSendMessagePayloadDto } from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';

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
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.WELCOME,
    };

    try {
      const user = await this.adminRepository.getAdminByTelegramId(String(chatId));

      if (!user) {
        this.logger.log('User not found', this.execute.name);
        await this.botService.sendHtmlMessage({
          ...payload,
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
        });

        return;
      }

      if (!user.adminTelegram.username && username) {
        this.logger.log(`Update username for user: ${chatId}, ${username}`, this.execute.name);
        user.updateTelegramInfo(username);
        await this.adminRepository.save(user);
      }

      await this.botService.sendHtmlMessage(payload, {
        username: username || user.adminTelegram.username,
      });
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
  }
}

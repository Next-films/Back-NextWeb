import { forwardRef, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { TelegramAdminBotService } from '@/telegram/admin-bot/application/telegram-admin-bot.service';
import { BotCommandsDto, BotSendMessagePayloadDto } from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import { TelegramAdminBotStartService } from '@/telegram/admin-bot/application/telegram-admin-bot-start.service';

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
    private readonly botStartService: TelegramAdminBotStartService,
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
      template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
    };

    try {
      const result = await this.botStartService.processStart(chatId, username);
      await this.botService.sendHtmlMessage({ ...payload, template: result.template }, result.data);
    } catch (error) {
      this.logger.error(error, this.execute.name);
    }
  }
}

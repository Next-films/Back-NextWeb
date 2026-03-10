import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TELEGRAM_ADMIN_BOT } from '@/common/constants/telegram-providers.constants';
import * as TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus } from '@nestjs/cqrs';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { TelegramAdminBotTemplatesService } from '@/telegram/admin-bot/application/telegram-admin-bot-templates.service';
import { AuthAdminTgUserCommand } from '@/telegram/admin-bot/application/guards/auth-tg-user.guard';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import {
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { BotCommandsDto, BotSendMessagePayloadDto } from '@/telegram/admin-bot/domain/types';
import { ADMIN_BOT_TEMPLATES_NAME_ENUM } from '@/telegram/admin-bot/domain/templates-name.enum';
import {
  ADMIN_TG_BOT_COMMAND,
  BOT_COMMANDS_INFO,
} from '@/common/constants/telegram-bot-commands.constants';
import { REQUEST_ID_KEY } from '@/common/utils/logger/request-context.middleware';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { SystemConnectionsStatusService } from '@/common/services/system-connections-status.service';

@Injectable()
export class TelegramAdminBotService implements OnModuleInit {
  private readonly main_telegram_group_chat_id: string;
  constructor(
    @Inject(TELEGRAM_ADMIN_BOT) private readonly bot: TelegramBot,
    protected readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly templatesService: TelegramAdminBotTemplatesService,
    private readonly asyncLocalStorageService: AsyncLocalStorageService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    protected readonly systemConnectionsStatusService: SystemConnectionsStatusService,
  ) {
    this.logger.setContext(TelegramAdminBotService.name);

    const apiSettings = this.configService.get('apiSettings', { infer: true });
    this.main_telegram_group_chat_id = apiSettings.MAIN_TELEGRAM_GROUP_CHAT_ID;
  }

  private isMainGroup(msg: TelegramBot.Message): boolean {
    const chatId = String(msg.chat.id);

    return chatId === this.main_telegram_group_chat_id;
  }

  private generateRequestId(): string {
    return `telegram-admin-bot-${Date.now()}-${randomUUID()}`;
  }

  private async auth(msg: TelegramBot.Message): Promise<boolean> {
    this.logger.log('Auth tg user', this.auth.name);

    const result = await this.commandBus.execute<
      AuthAdminTgUserCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >(new AuthAdminTgUserCommand(msg));

    this.logger.log(result.appResult, this.auth.name);

    if (result.appResult !== AppNotificationResultEnum.Success) {
      const chatId = msg.from?.id;

      if (chatId) {
        const payload: BotSendMessagePayloadDto = {
          chatId: chatId,
          template: ADMIN_BOT_TEMPLATES_NAME_ENUM.I_DONT_KNOW_YOU,
        };

        await this.sendHtmlMessage(payload);
      }

      return false;
    }

    return true;
  }

  private async handleCommand(msg: TelegramBot.Message): Promise<void> {
    this.logger.log('Handle command', this.handleCommand.name);
    const commandKey = msg.text;
    const Command = ADMIN_TG_BOT_COMMAND[commandKey!];
    const chatId = msg.from?.id;

    if (!chatId) {
      this.logger.debug(`Undefined chat id: ${chatId}`, this.handleCommand.name);

      return;
    }

    if (!Command) {
      this.logger.debug(`Undefined command: ${commandKey}`, this.handleCommand.name);
      await this.sendHtmlMessage({
        chatId,
        template: ADMIN_BOT_TEMPLATES_NAME_ENUM.UNDEFINED_COMMAND,
      });

      return;
    }

    const payload: BotCommandsDto = {
      tgMessage: msg,
    };

    await this.commandBus.execute(new Command(payload));
  }

  private async handleText(msg: TelegramBot.Message): Promise<void> {
    this.logger.log('Handle text', this.handleText.name);
    const chatId = msg.from?.id;

    if (!chatId) {
      this.logger.debug(`Undefined chat id: ${chatId}`, this.handleCommand.name);

      return;
    }

    await this.sendHtmlMessage({ chatId, template: ADMIN_BOT_TEMPLATES_NAME_ENUM.UNKNOWN_MESSAGE });
  }

  private async setBotCommand(): Promise<void> {
    const commands = Object.values(BOT_COMMANDS_INFO);
    const botCommands: TelegramBot.BotCommand[] = [];

    for (const command of commands) {
      const { COMMAND, DESCRIPTION } = command;

      if (COMMAND !== BOT_COMMANDS_INFO.START.COMMAND) {
        botCommands.push({
          command: COMMAND,
          description: DESCRIPTION,
        });
      }
    }

    if (botCommands.length > 0) {
      await this.bot.setMyCommands(botCommands);

      this.logger.log(
        `Added commands for telegram bot: ${JSON.stringify(botCommands)}`,
        this.setBotCommand.name,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Bot service init.', this.onModuleInit.name);
    try {
      const bot = await this.bot.getMe();

      this.logger.log(`Bot info: ${JSON.stringify(bot)}`, this.onModuleInit.name);
      await this.setBotCommand();

      this.bot.on('message', (msg: TelegramBot.Message): void => {
        this.systemConnectionsStatusService.markTelegramConnected();
        this.asyncLocalStorageService.start(() => {
          void (async () => {
            const store = this.asyncLocalStorageService.getStore();
            const text = msg.text;

            const isMainGroup = this.isMainGroup(msg);
            if (isMainGroup) return;

            const isAuth = await this.auth(msg);
            if (!isAuth) return;

            store?.set(REQUEST_ID_KEY, this.generateRequestId());
            await (text && text.startsWith('/') ? this.handleCommand(msg) : this.handleText(msg));
          })();
        });
      });

      this.bot.on('polling_error', (error: unknown): void => {
        this.systemConnectionsStatusService.markTelegramDisconnected(error);
      });

      void this.bot.startPolling();
      this.systemConnectionsStatusService.markTelegramConnected();
    } catch (error) {
      this.systemConnectionsStatusService.markTelegramDisconnected(error);
      this.logger.error(error, this.onModuleInit.name);
    }
  }

  async sendTextMessage(chatId: number, message: string): Promise<void> {
    this.logger.log('Send text message', this.sendTextMessage.name);
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error(error, this.sendTextMessage.name);
    }
  }

  async sendHtmlMessage(payload: BotSendMessagePayloadDto, data?: object): Promise<void> {
    this.logger.log('Send html message', this.sendHtmlMessage.name);
    const { template: templateName, chatId, threadId } = payload;

    try {
      const template = this.templatesService.getTemplateHTML(templateName, data);

      if (!template) {
        this.logger.debug('Template not found', this.sendHtmlMessage.name);

        return;
      }
      await this.bot.sendMessage(chatId, template, {
        parse_mode: 'HTML',
        ...(threadId ? { message_thread_id: threadId } : {}),
      });
    } catch (error) {
      this.logger.error(error, this.sendHtmlMessage.name);
    }
  }

  getMovieTypeString(type: MovieTypesEnum): string {
    switch (type) {
      case MovieTypesEnum.FILM:
        return 'Фильм';
      case MovieTypesEnum.SERIAL:
        return 'Сериал';
      case MovieTypesEnum.CARTOON:
        return 'Мультфильм';
      default: {
        return 'unknown';
      }
    }
  }
}

@Injectable()
export class TelegramAdminBotServiceMock extends TelegramAdminBotService {
  constructor(
    bot: TelegramBot,
    logger: LoggerService,
    commandBus: CommandBus,
    templatesService: TelegramAdminBotTemplatesService,
    asyncLocalStorageService: AsyncLocalStorageService,
    configService: ConfigService<ConfigurationType, true>,
    systemConnectionsStatusService: SystemConnectionsStatusService,
  ) {
    super(
      bot,
      logger,
      commandBus,
      templatesService,
      asyncLocalStorageService,
      configService,
      systemConnectionsStatusService,
    );

    this.logger.setContext(TelegramAdminBotServiceMock.name);
  }
  async onModuleInit(): Promise<void> {
    this.logger.log('Telegram admin bot service module init (mock).', this.onModuleInit.name);
    this.systemConnectionsStatusService.markTelegramConnected();
    await new Promise(res => res('OK'));
  }

  async sendTextMessage(chatId: number, message: string): Promise<void> {
    this.logger.log(
      `Send text message, chat id: ${chatId}, message: ${message} (mock).`,
      this.sendTextMessage.name,
    );
    await new Promise(res => res('OK'));
  }

  async sendHtmlMessage(payload: BotSendMessagePayloadDto, data?: object): Promise<void> {
    this.logger.log('Send html message', this.sendHtmlMessage.name);
    this.logger.log(
      `Send html message, payload: ${JSON.stringify(payload)}, data: ${JSON.stringify(
        data,
      )} (mock).`,
      this.sendTextMessage.name,
    );
    await new Promise(res => res('OK'));
  }
}

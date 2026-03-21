import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotSendMessagePayloadDto } from '@/telegram/admin-bot/domain/types';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConfigurationType } from '@/settings/configuration';
import { MovieTypesEnum } from '@/common/types/types';
import { SystemConnectionsStatusService } from '@/common/services/system-connections-status.service';

@Injectable()
export class TelegramAdminBotService implements OnModuleInit {
  private readonly gatewayUrl: string;
  private readonly gatewayToken: string;

  constructor(
    protected readonly logger: LoggerService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    protected readonly systemConnectionsStatusService: SystemConnectionsStatusService,
  ) {
    this.logger.setContext(TelegramAdminBotService.name);

    const apiSettings = this.configService.get('apiSettings', { infer: true });
    this.gatewayUrl = (apiSettings.TELEGRAM_GATEWAY_URL || '').trim().replace(/\/+$/, '');
    this.gatewayToken = (apiSettings.TELEGRAM_GATEWAY_TOKEN || '').trim();
  }

  onModuleInit(): void {
    if (!this.gatewayUrl || !this.gatewayToken) {
      this.systemConnectionsStatusService.markTelegramDisconnected(
        'Telegram gateway is not configured',
      );
      this.logger.warn(
        'Telegram gateway disabled: TELEGRAM_GATEWAY_URL or TELEGRAM_GATEWAY_TOKEN is empty',
        this.onModuleInit.name,
      );
      return;
    }

    this.systemConnectionsStatusService.markTelegramConnected();
    this.logger.log(`Telegram gateway configured: ${this.gatewayUrl}`, this.onModuleInit.name);
  }

  private async sendToGateway(payload: {
    chatId: number | string;
    message?: string;
    template?: string;
    data?: object;
    parseMode?: 'HTML';
    threadId?: number;
  }): Promise<void> {
    if (!this.gatewayUrl || !this.gatewayToken) {
      this.logger.warn('Skip telegram send: gateway is not configured', this.sendToGateway.name);
      return;
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/internal/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.gatewayToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        this.systemConnectionsStatusService.markTelegramDisconnected(
          `Gateway send failed: ${response.status} ${body}`,
        );
        this.logger.error(
          `Telegram gateway send failed. status=${response.status}, body=${body}`,
          this.sendToGateway.name,
        );
        return;
      }

      this.systemConnectionsStatusService.markTelegramConnected();
    } catch (error) {
      this.systemConnectionsStatusService.markTelegramDisconnected(error);
      this.logger.error(error, this.sendToGateway.name);
    }
  }

  async sendTextMessage(chatId: number, message: string): Promise<void> {
    this.logger.log('Send text message', this.sendTextMessage.name);

    await this.sendToGateway({ chatId, message });
  }

  async sendHtmlMessage(payload: BotSendMessagePayloadDto, data?: object): Promise<void> {
    this.logger.log('Send html message', this.sendHtmlMessage.name);
    const { template: templateName, chatId, threadId } = payload;

    try {
      await this.sendToGateway({
        chatId,
        threadId,
        template: templateName,
        ...(data ? { data } : {}),
        parseMode: 'HTML',
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
    logger: LoggerService,
    configService: ConfigService<ConfigurationType, true>,
    systemConnectionsStatusService: SystemConnectionsStatusService,
  ) {
    super(logger, configService, systemConnectionsStatusService);

    this.logger.setContext(TelegramAdminBotServiceMock.name);
  }

  onModuleInit(): void {
    this.logger.log('Telegram admin bot service module init (mock).', this.onModuleInit.name);
    this.systemConnectionsStatusService.markTelegramConnected();
  }

  async sendTextMessage(chatId: number, message: string): Promise<void> {
    this.logger.log(
      `Send text message, chat id: ${chatId}, message: ${message} (mock).`,
      this.sendTextMessage.name,
    );
    await Promise.resolve();
  }

  async sendHtmlMessage(payload: BotSendMessagePayloadDto, data?: object): Promise<void> {
    this.logger.log('Send html message', this.sendHtmlMessage.name);
    this.logger.log(
      `Send html message, payload: ${JSON.stringify(payload)}, data: ${JSON.stringify(
        data,
      )} (mock).`,
      this.sendTextMessage.name,
    );
    await Promise.resolve();
  }
}

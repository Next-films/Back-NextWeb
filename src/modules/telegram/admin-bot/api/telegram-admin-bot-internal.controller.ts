import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { TelegramAdminBotStartService } from '@/telegram/admin-bot/application/telegram-admin-bot-start.service';
import { TelegramStartInputDto } from '@/telegram/admin-bot/api/dtos/telegram-start.input.dto';
import { TelegramStartOutputDto } from '@/telegram/admin-bot/api/dtos/telegram-start.output.dto';
import { TelegramStartInternalTokenGuard } from '@/telegram/admin-bot/application/guards/telegram-start-internal-token.guard';

@ApiTags('Internal telegram gateway API')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@UseGuards(TelegramStartInternalTokenGuard)
@Controller(`${EXTERNAL_API_ROUTE.MAIN}/telegram`)
export class TelegramAdminBotInternalController {
  constructor(
    private readonly logger: LoggerService,
    private readonly botStartService: TelegramAdminBotStartService,
  ) {
    this.logger.setContext(TelegramAdminBotInternalController.name);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async processStart(@Body() body: TelegramStartInputDto): Promise<TelegramStartOutputDto> {
    const { chatId, username } = body;
    this.logger.log(`Internal telegram start, chatId: ${chatId}`, this.processStart.name);

    const result = await this.botStartService.processStart(chatId, username);

    return {
      template: result.template,
      ...(result.data ? { data: result.data as Record<string, unknown> } : {}),
      parseMode: 'HTML',
    };
  }
}

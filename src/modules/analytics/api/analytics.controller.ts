import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from '@/analytics/application/analytics.service';
import { AnalyticsEventInputDto } from '@/analytics/api/dtos/analytics-event.input.dto';
import { AnalyticsEventType } from '@/analytics/domain/analytics-event.entity';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @HttpCode(HttpStatus.CREATED)
  async trackEvent(@Body() body: AnalyticsEventInputDto, @Req() req: Request) {
    if (body.type === AnalyticsEventType.VIEW && (!body.contentType || !body.contentId)) {
      throw new BadRequestException('contentType and contentId are required for view events');
    }

    const ipHeader = req.headers['x-forwarded-for'];
    const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader || req.ip;

    await this.analyticsService.trackEvent({
      type: body.type,
      contentType: body.contentType || null,
      contentId: body.contentId || null,
      visitorId: body.visitorId || null,
      ip: ip ? String(ip) : null,
      userAgent: req.headers['user-agent'] ? String(req.headers['user-agent']) : null,
    });

    return { ok: true };
  }

  @Get('top')
  async getTop(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.analyticsService.getTopContentAllTime(Number.isFinite(parsed) ? parsed : 10);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AnalyticsService } from '@/analytics/application/analytics.service';
import {
  AnalyticsRangeEnum,
  AnalyticsRangeInputDto,
} from '@/analytics/api/dtos/analytics-range.input.dto';
import { ADMIN_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';
import { AdminAccessTokenGuard } from '@/admin-auth/application/guards/jwt/admin-access-token.guard';
import { ADMIN_ANALYTICS_ROUTE } from '@/common/constants/route.constants';
import { RequestExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

@UseGuards(AdminAccessTokenGuard)
@ApiBearerAuth(ADMIN_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: RequestExceptionDto })
@Controller(ADMIN_ANALYTICS_ROUTE.MAIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(ADMIN_ANALYTICS_ROUTE.SUMMARY)
  async getSummary(@Query() query: AnalyticsRangeInputDto) {
    const range = query.range || AnalyticsRangeEnum.WEEK;
    return this.analyticsService.getSummary(range);
  }

  @Get(ADMIN_ANALYTICS_ROUTE.VISITS)
  async getVisits(@Query() query: AnalyticsRangeInputDto) {
    const range = query.range || AnalyticsRangeEnum.WEEK;
    return this.analyticsService.getVisitsSeries(range);
  }

  @Get(ADMIN_ANALYTICS_ROUTE.GENRES)
  async getGenres(@Query() query: AnalyticsRangeInputDto) {
    const range = query.range || AnalyticsRangeEnum.WEEK;
    return this.analyticsService.getGenreStats(range);
  }

  @Get(ADMIN_ANALYTICS_ROUTE.TYPES)
  async getTypes(@Query() query: AnalyticsRangeInputDto) {
    const range = query.range || AnalyticsRangeEnum.WEEK;
    return this.analyticsService.getTypeStats(range);
  }
}

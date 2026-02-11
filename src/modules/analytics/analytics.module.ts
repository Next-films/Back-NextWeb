import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEventEntity } from '@/analytics/domain/analytics-event.entity';
import { AnalyticsService } from '@/analytics/application/analytics.service';
import { AnalyticsController } from '@/analytics/api/analytics.controller';
import { AdminAnalyticsController } from '@/analytics/api/admin-analytics.controller';
import { Film } from '@/films/domain/film.entity';
import { Serial } from '@/serials/domain/serial.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { AdminAuthModule } from '@/admin-auth/admin-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEventEntity, Film, Serial, Cartoon]),
    AdminAuthModule,
  ],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

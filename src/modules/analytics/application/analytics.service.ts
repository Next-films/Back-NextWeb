import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  AnalyticsContentType,
  AnalyticsEventEntity,
  AnalyticsEventType,
} from '@/analytics/domain/analytics-event.entity';
import { AnalyticsRangeEnum } from '@/analytics/api/dtos/analytics-range.input.dto';
import { Film } from '@/films/domain/film.entity';
import { Serial } from '@/serials/domain/serial.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { MovieHandleStatus } from '@/movies/domain/types';

type RangeDates = { start: Date; end: Date };
type TopRow = { contentType: AnalyticsContentType; contentId: string; views: string };

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEventEntity)
    private readonly analyticsEventRepository: Repository<AnalyticsEventEntity>,
    @InjectRepository(Film)
    private readonly filmRepository: Repository<Film>,
    @InjectRepository(Serial)
    private readonly serialRepository: Repository<Serial>,
    @InjectRepository(Cartoon)
    private readonly cartoonRepository: Repository<Cartoon>,
  ) {}

  async trackEvent(
    event: Pick<
      AnalyticsEventEntity,
      'type' | 'contentType' | 'contentId' | 'visitorId' | 'ip' | 'userAgent'
    >,
  ): Promise<void> {
    const entity = this.analyticsEventRepository.create({
      ...event,
      contentType: event.contentType || null,
      contentId: event.contentId || null,
      visitorId: event.visitorId || null,
      ip: event.ip || null,
      userAgent: event.userAgent || null,
    });

    await this.analyticsEventRepository.save(entity);
  }

  async getSummary(range: AnalyticsRangeEnum) {
    const { start, end } = this.getRangeDates(range);

    const visits = await this.getVisitsCount(start, end);
    const views = await this.analyticsEventRepository.count({
      where: { type: AnalyticsEventType.VIEW, createdAt: Between(start, end) },
    });

    const uniqueVisitors = await this.getUniqueVisitorsCount(start, end);

    const avgViewsPerVisit = visits > 0 ? Number((views / visits).toFixed(2)) : 0;
    return {
      visits,
      views,
      uniqueVisitors,
      avgViewsPerVisit,
    };
  }

  async getVisitsSeries(range: AnalyticsRangeEnum) {
    const { start, end } = this.getRangeDates(range);

    const rows = await this.analyticsEventRepository
      .createQueryBuilder('e')
      .select("date_trunc('day', e.createdAt)", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('e.type = :type', { type: AnalyticsEventType.VISIT })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; count: string }>();

    const countsByDay = new Map(
      rows.map(row => [this.formatDateOnly(new Date(row.day)), Number(row.count)]),
    );

    const labels: string[] = [];
    const values: number[] = [];

    for (const day of this.iterateDays(start, end)) {
      const label = this.formatDateOnly(day);
      labels.push(label);
      values.push(countsByDay.get(label) || 0);
    }

    return { labels, values };
  }

  async getGenreStats(range: AnalyticsRangeEnum, limit = 6) {
    const { start, end } = this.getRangeDates(range);
    const safeLimit = Math.max(Number(limit) || 6, 1);

    const rows = await this.analyticsEventRepository
      .createQueryBuilder('e')
      .leftJoin(Film, 'f', 'e.contentType = :filmType AND e.contentId = f.id', {
        filmType: AnalyticsContentType.FILM,
      })
      .leftJoin('f.genres', 'fg')
      .leftJoin(Serial, 's', 'e.contentType = :serialType AND e.contentId = s.id', {
        serialType: AnalyticsContentType.SERIAL,
      })
      .leftJoin('s.genres', 'sg')
      .leftJoin(Cartoon, 'c', 'e.contentType = :cartoonType AND e.contentId = c.id', {
        cartoonType: AnalyticsContentType.CARTOON,
      })
      .leftJoin('c.genres', 'cg')
      .select('COALESCE(fg.name, sg.name, cg.name)', 'name')
      .addSelect('COUNT(*)', 'value')
      .where('e.type = :type', { type: AnalyticsEventType.VIEW })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('e.contentType IS NOT NULL')
      .andWhere('e.contentId IS NOT NULL')
      .andWhere('COALESCE(fg.name, sg.name, cg.name) IS NOT NULL')
      .groupBy('COALESCE(fg.name, sg.name, cg.name)')
      .orderBy('value', 'DESC')
      .limit(safeLimit)
      .getRawMany<{ name: string; value: string }>();

    return rows.map(row => ({
      name: this.capitalize(row.name),
      value: Number(row.value),
    }));
  }

  async getTypeStats(range: AnalyticsRangeEnum) {
    const { start, end } = this.getRangeDates(range);

    const rows = await this.analyticsEventRepository
      .createQueryBuilder('e')
      .select('e.contentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('e.type = :type', { type: AnalyticsEventType.VIEW })
      .andWhere('e.contentType IS NOT NULL')
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('e.contentType')
      .getRawMany<{ type: AnalyticsContentType; count: string }>();

    const result = new Map<AnalyticsContentType, number>([
      [AnalyticsContentType.FILM, 0],
      [AnalyticsContentType.SERIAL, 0],
      [AnalyticsContentType.CARTOON, 0],
    ]);

    for (const row of rows) {
      result.set(row.type, Number(row.count));
    }

    return Array.from(result.entries()).map(([type, value]) => ({ type, value }));
  }

  async getTopContentAllTime(limit = 10) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    try {
      const rows = await this.analyticsEventRepository
        .createQueryBuilder('e')
        .select('e.contentType', 'contentType')
        .addSelect('e.contentId', 'contentId')
        .addSelect('COUNT(*)', 'views')
        .where('e.type = :type', { type: AnalyticsEventType.VIEW })
        .andWhere('e.contentType IS NOT NULL')
        .andWhere('e.contentId IS NOT NULL')
        .groupBy('e.contentType')
        .addGroupBy('e.contentId')
        .orderBy('views', 'DESC')
        .limit(safeLimit)
        .getRawMany<TopRow>();

      const topList = rows.map(row => ({
        contentType: row.contentType,
        contentId: Number(row.contentId),
        views: Number(row.views),
      }));

      const resolved = await this.resolveTopItems(topList);

      if (resolved.length >= safeLimit) return resolved.slice(0, safeLimit);

      const filled = await this.fillWithRandomItems(resolved, safeLimit);
      return filled.slice(0, safeLimit);
    } catch (error) {
      const trace = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to fetch analytics top content, using fallback list', trace);
      const fallback = await this.fillWithRandomItems([], safeLimit);
      return fallback.slice(0, safeLimit);
    }
  }

  private async resolveTopItems(
    items: { contentType: AnalyticsContentType; contentId: number; views: number }[],
  ) {
    const idsByType = new Map<AnalyticsContentType, number[]>();
    for (const item of items) {
      if (!idsByType.has(item.contentType)) idsByType.set(item.contentType, []);
      idsByType.get(item.contentType)!.push(item.contentId);
    }

    const films = await this.getMoviesByIds(
      this.filmRepository,
      idsByType.get(AnalyticsContentType.FILM),
    );
    const serials = await this.getMoviesByIds(
      this.serialRepository,
      idsByType.get(AnalyticsContentType.SERIAL),
    );
    const cartoons = await this.getMoviesByIds(
      this.cartoonRepository,
      idsByType.get(AnalyticsContentType.CARTOON),
    );

    const lookup = new Map<string, { id: number; title: string; previewUrl: string | null }>();
    films.forEach(item => lookup.set(`${AnalyticsContentType.FILM}:${item.id}`, item));
    serials.forEach(item => lookup.set(`${AnalyticsContentType.SERIAL}:${item.id}`, item));
    cartoons.forEach(item => lookup.set(`${AnalyticsContentType.CARTOON}:${item.id}`, item));

    return items
      .map(item => {
        const key = `${item.contentType}:${item.contentId}`;
        const content = lookup.get(key);
        if (!content) return null;
        return {
          ...content,
          contentType: item.contentType,
          views: item.views,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: number;
          title: string;
          previewUrl: string | null;
          contentType: AnalyticsContentType;
          views: number;
        } => Boolean(item),
      );
  }

  private async getMoviesByIds<T extends Film | Serial | Cartoon>(
    repository: Repository<T>,
    ids?: number[],
  ) {
    if (!ids || ids.length === 0) return [];
    const rows = await repository.find({
      where: { id: In(ids), isHidden: false, handleStatus: MovieHandleStatus.PRODUCTION } as any,
    });

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      previewUrl: row.previewUrl || row.backgroundContentUrl || row.titleUrl || null,
    }));
  }

  private async fillWithRandomItems(
    existing: Array<{
      id: number;
      title: string;
      previewUrl: string | null;
      contentType: AnalyticsContentType;
      views: number;
    }>,
    limit: number,
  ) {
    const used = new Map<AnalyticsContentType, Set<number>>();
    for (const item of existing) {
      if (!used.has(item.contentType)) used.set(item.contentType, new Set());
      used.get(item.contentType)!.add(item.id);
    }

    const remaining = limit - existing.length;
    if (remaining <= 0) return existing;

    const randomItems: typeof existing = [];

    randomItems.push(
      ...(await this.getRandomByType(
        this.filmRepository,
        AnalyticsContentType.FILM,
        used.get(AnalyticsContentType.FILM),
        remaining,
      )),
    );
    randomItems.push(
      ...(await this.getRandomByType(
        this.serialRepository,
        AnalyticsContentType.SERIAL,
        used.get(AnalyticsContentType.SERIAL),
        remaining,
      )),
    );
    randomItems.push(
      ...(await this.getRandomByType(
        this.cartoonRepository,
        AnalyticsContentType.CARTOON,
        used.get(AnalyticsContentType.CARTOON),
        remaining,
      )),
    );

    const deduped = new Map<string, (typeof existing)[number]>();
    for (const item of [...existing, ...randomItems]) {
      const key = `${item.contentType}:${item.id}`;
      if (!deduped.has(key)) deduped.set(key, item);
    }

    return Array.from(deduped.values());
  }

  private async getRandomByType<T extends Film | Serial | Cartoon>(
    repository: Repository<T>,
    contentType: AnalyticsContentType,
    excludeIds?: Set<number>,
    limit = 10,
  ) {
    const qb = repository.createQueryBuilder('m');
    qb.where('m.isHidden = false').andWhere('m.handleStatus = :status', {
      status: MovieHandleStatus.PRODUCTION,
    });

    if (excludeIds && excludeIds.size > 0) {
      qb.andWhere('m.id NOT IN (:...excludeIds)', { excludeIds: Array.from(excludeIds) });
    }

    qb.orderBy('RANDOM()').take(limit);

    const rows = await qb.getMany();
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      previewUrl: row.previewUrl || row.backgroundContentUrl || row.titleUrl || null,
      contentType,
      views: 0,
    }));
  }

  private getRangeDates(range: AnalyticsRangeEnum): RangeDates {
    const now = new Date();
    const end = this.endOfDay(now);

    let days = 7;
    if (range === AnalyticsRangeEnum.MONTH) days = 30;
    if (range === AnalyticsRangeEnum.YEAR) days = 365;

    const start = this.startOfDay(new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    return { start, end };
  }

  private async getUniqueVisitorsCount(start: Date, end: Date): Promise<number> {
    const row = await this.analyticsEventRepository
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT COALESCE(e.visitorId, e.ip))', 'count')
      .where('e.type = :type', { type: AnalyticsEventType.VISIT })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne<{ count: string }>();

    return Number(row?.count || 0);
  }

  private async getVisitsCount(start: Date, end: Date): Promise<number> {
    const row = await this.analyticsEventRepository
      .createQueryBuilder('e')
      .select('COUNT(*)', 'count')
      .where('e.type = :type', { type: AnalyticsEventType.VISIT })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .getRawOne<{ count: string }>();

    return Number(row?.count || 0);
  }

  private *iterateDays(start: Date, end: Date): Generator<Date> {
    const current = new Date(start.getTime());
    while (current <= end) {
      yield new Date(current.getTime());
      current.setDate(current.getDate() + 1);
    }
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date.getTime());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private endOfDay(date: Date): Date {
    const result = new Date(date.getTime());
    result.setHours(23, 59, 59, 999);
    return result;
  }

  private capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { Cron } from '@nestjs/schedule';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { subMonths } from 'date-fns';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_KEY } from '@/common/utils/logger/request-context.middleware';

@Injectable()
export class ConverterLogsTaskService {
  private readonly maxBatchLogSize: number = 100;
  private readonly logExpiredMonthCount: number = 1;
  constructor(
    private readonly logger: LoggerService,
    private readonly converterLogsRepository: ConverterLogsRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
    private readonly asyncLocalStorageService: AsyncLocalStorageService,
  ) {
    this.logger.setContext(ConverterLogsTaskService.name);
  }
  private generateRequestId(): string {
    return `converter-logs-${Date.now()}-${randomUUID()}`;
  }

  private async clearLogs(): Promise<void> {
    try {
      const date = subMonths(new Date(), this.logExpiredMonthCount);
      const logs = await this.converterLogsRepository.getExpiredLogs(date, this.maxBatchLogSize);

      if (!logs) {
        this.logger.log('No data to clear', this.clearLogs.name);

        return;
      }

      const keys = logs.map(log => log.url.replace(/^https?:\/\/[^/]+\//, ''));

      await this.rmqResultHandlerUtil.getRmqData(
        () => this.downloaderServiceAdapter.clearLogs(keys),
        'Clear logs',
      );

      await this.converterLogsRepository.remove(logs);

      this.logger.log(`Removed ${keys.length} logs`);
    } catch (e) {
      this.logger.error(e, this.clearLogs.name);
    }
  }

  private runTaskWithRequestId(taskFn: () => Promise<void>): void {
    this.asyncLocalStorageService.start(() => {
      const store = this.asyncLocalStorageService.getStore();

      store?.set(REQUEST_ID_KEY, this.generateRequestId());

      taskFn();
    });
  }

  @Cron('0 0 * * 0')
  clearLogsTask(): void {
    this.logger.log('Clearing logs task', this.clearLogsTask.name);
    this.runTaskWithRequestId(() => this.clearLogs());
  }
}

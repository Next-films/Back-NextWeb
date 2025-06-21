import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { Cron } from '@nestjs/schedule';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import { HandledRmqErrorType } from '@/common/types/types';
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

  private isRmqError(result: AppNotificationResultEnum): HandledRmqErrorType {
    const isInternalError = this.rmqResultHandlerUtil.isInternalError(result);
    const isUnauthorizedError = this.rmqResultHandlerUtil.isUnauthorizedError(result);

    if (isInternalError || isUnauthorizedError) {
      return {
        isError: true,
        isStopProcess: true,
      };
    }

    return {
      isError: false,
      isStopProcess: false,
    };
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

      let result = await this.downloaderServiceAdapter.clearLogs(keys);

      const { isError, isStopProcess } = this.isRmqError(result.appResult);

      if (isError && isStopProcess) {
        this.logger.warn(`Retry rmq request (clear converter logs)`, this.clearLogs.name);
        result = await this.downloaderServiceAdapter.clearLogs(keys);

        const { isError: retryErr, isStopProcess: retryStop } = this.isRmqError(result.appResult);

        if (retryErr && retryStop) {
          throw new Error(`Rmq error, stop processing: ${retryStop}`);
        }
      }

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

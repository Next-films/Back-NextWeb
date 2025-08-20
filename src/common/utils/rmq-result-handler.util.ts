import { Injectable } from '@nestjs/common';
import { AppNotificationResult, AppNotificationResultEnum } from './app-notification.util';
import { LoggerService } from '@/common/utils/logger/logger.service';

@Injectable()
export class RmqResultHandlerUtil {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(RmqResultHandlerUtil.name);
  }

  private isBaseRmqError(result: AppNotificationResultEnum): boolean {
    const isInternalError = this.isInternalError(result);
    const isUnauthorizedError = this.isUnauthorizedError(result);

    return isInternalError || isUnauthorizedError;
  }

  isInternalError(result: AppNotificationResultEnum): boolean {
    return result === AppNotificationResultEnum.InternalError;
  }

  isUnauthorizedError(result: AppNotificationResultEnum): boolean {
    return result === AppNotificationResultEnum.Unauthorized;
  }

  isForbiddenError(result: AppNotificationResultEnum): boolean {
    return result === AppNotificationResultEnum.Forbidden;
  }

  isBadRequestError(result: AppNotificationResultEnum): boolean {
    return result === AppNotificationResultEnum.BadRequest;
  }

  isNotFoundError(result: AppNotificationResultEnum): boolean {
    return result === AppNotificationResultEnum.NotFound;
  }

  async getRmqData<T = null, D = null>(
    fn: () => Promise<AppNotificationResult<T, D>>,
    scope: string,
  ): Promise<AppNotificationResult<T, D>> {
    let result = await fn();

    const isError = this.isBaseRmqError(result.appResult);

    if (isError) {
      this.logger.warn(`Retry rmq request (${scope})`, this.getRmqData.name);
      result = await fn();

      const retryErr = this.isBaseRmqError(result.appResult);

      if (retryErr) throw new Error(`Rmq error, stop processing.`);
    }

    return result;
  }
}

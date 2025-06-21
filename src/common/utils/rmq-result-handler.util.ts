import { Injectable } from '@nestjs/common';
import { AppNotificationResultEnum } from './app-notification.util';

@Injectable()
export class RmqResultHandlerUtil {
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
}

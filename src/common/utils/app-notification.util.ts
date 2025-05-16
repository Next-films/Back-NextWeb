import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export enum AppNotificationResultEnum {
  'Conflict' = 'Conflict',
  'Success' = 'Success',
  'NotFound' = 'NotFound',
  'BadRequest' = 'BadRequest',
  'Forbidden' = 'Forbidden',
  'Unauthorized' = 'Unauthorized',
  'InternalError' = 'InternalError',
  'UnprocessableEntity' = 'UnprocessableEntity',
}

export class AppNotificationResult<T, D = null> {
  data: NonNullable<T> | null;
  errorField?: D | null;
  appResult: AppNotificationResultEnum;
}

@Injectable()
export class ApplicationNotification {
  success<T>(data: T): AppNotificationResult<T> {
    return {
      appResult: AppNotificationResultEnum.Success,
      data: data ?? null,
      errorField: null,
    };
  }

  badRequest<T = null, D = null>(error: D, data?: T): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.BadRequest,
      data: data ?? null,
      errorField: error,
    };
  }

  notFound<T = null, D = null>(error?: D, data?: T): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.NotFound,
      data: data ?? null,
      errorField: error ?? null,
    };
  }

  conflict<T = null, D = null>(error?: D, data?: T): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.Conflict,
      data: data ?? null,
      errorField: error ?? null,
    };
  }

  unauthorized<T = null, D = null>(error?: D, data?: T): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.Unauthorized,
      data: data ?? null,
      errorField: error ?? null,
    };
  }

  forbidden<T = null, D = null>(error?: D, data?: T): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.Forbidden,
      data: data ?? null,
      errorField: error ?? null,
    };
  }

  internalServerError<T = null, D = null>(): AppNotificationResult<T, D> {
    return {
      appResult: AppNotificationResultEnum.InternalError,
      data: null,
      errorField: null,
    };
  }

  handleHttpResult<T, D>(result: AppNotificationResult<T, D | null>): void {
    const errorMap = {
      [AppNotificationResultEnum.NotFound]: () => {
        throw new NotFoundException(result.errorField);
      },
      [AppNotificationResultEnum.BadRequest]: () => {
        throw new BadRequestException(result.errorField);
      },
      [AppNotificationResultEnum.Unauthorized]: () => {
        throw new UnauthorizedException(result.errorField);
      },
      [AppNotificationResultEnum.Forbidden]: () => {
        throw new ForbiddenException(result.errorField);
      },
      [AppNotificationResultEnum.Conflict]: () => {
        throw new ConflictException(result.errorField);
      },
    };

    if (result.appResult === AppNotificationResultEnum.Success) {
      return;
    }

    (
      errorMap[result.appResult] ||
      (() => {
        throw new InternalServerErrorException(result.errorField || 'An unexpected error occurred');
      })
    )();
  }
}

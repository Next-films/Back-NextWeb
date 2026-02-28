import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
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

type ErrorOnlyResultEnum = Exclude<
  AppNotificationResultEnum,
  AppNotificationResultEnum.Success | AppNotificationResultEnum.InternalError
>;

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

  handleHttpResult<T, D>(
    result: AppNotificationResult<T, D | null>,
    isFullResponse: boolean = false,
  ): void | AppNotificationResult<T, D> {
    if (result.appResult === AppNotificationResultEnum.Success) {
      return isFullResponse ? (result as AppNotificationResult<T, D>) : undefined;
    }

    const exceptionPayload = isFullResponse ? result : result.errorField;

    const exceptionMap: Record<ErrorOnlyResultEnum, () => never> = {
      [AppNotificationResultEnum.NotFound]: () => {
        throw new NotFoundException(exceptionPayload);
      },
      [AppNotificationResultEnum.BadRequest]: () => {
        throw new BadRequestException(exceptionPayload);
      },
      [AppNotificationResultEnum.Unauthorized]: () => {
        throw new UnauthorizedException(exceptionPayload);
      },
      [AppNotificationResultEnum.Forbidden]: () => {
        throw new ForbiddenException(exceptionPayload);
      },
      [AppNotificationResultEnum.Conflict]: () => {
        throw new ConflictException(exceptionPayload);
      },
      [AppNotificationResultEnum.UnprocessableEntity]: () => {
        throw new UnprocessableEntityException(exceptionPayload);
      },
    };

    const throwException =
      exceptionMap[result.appResult] ||
      (() => {
        throw new InternalServerErrorException(exceptionPayload || 'An unexpected error occurred');
      });

    throwException();
  }
}

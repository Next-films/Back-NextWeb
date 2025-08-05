import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  ApplicationNotification,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import {
  ErrorFieldExceptionDto,
  isBadRequestError,
  ValidationErrorsDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { ApiProperty } from '@nestjs/swagger';

export class HttpPrivateExceptionDto<T = null> {
  @ApiProperty({ nullable: true })
  data: NonNullable<T> | null;
  @ApiProperty({ type: ErrorFieldExceptionDto, isArray: true, nullable: true })
  errorField?: ErrorFieldExceptionDto[] | null;
  @ApiProperty({ enum: AppNotificationResultEnum })
  appResult: AppNotificationResultEnum;
}

@Catch()
export class HttpPrivateExceptionsFilter implements ExceptionFilter {
  constructor(private readonly appNotification: ApplicationNotification) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    return this.handleHttp(exception, response);
  }

  handleHttp(exception: HttpException, response: Response): void {
    const status = exception.getStatus();
    const res = exception.getResponse();

    let err: HttpPrivateExceptionDto = this.appNotification.internalServerError();
    let errorField: ErrorFieldExceptionDto[] | null = null;

    if (typeof res === 'string') {
      errorField = null;
    } else if (typeof res === 'object' && res && (res as ValidationErrorsDto).errorsMessages) {
      errorField = (res as ValidationErrorsDto).errorsMessages;
    } else {
      const errors = res as ErrorFieldExceptionDto[] | ErrorFieldExceptionDto;

      if (Array.isArray(errors)) {
        errorField = errors;
      } else if (isBadRequestError(errors)) {
        errorField = [errors];
      } else {
        errorField = null;
      }
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      err = this.appNotification.unauthorized(errorField);
    }

    if (status === HttpStatus.BAD_REQUEST) {
      err = this.appNotification.badRequest(errorField);
    }

    if (status === HttpStatus.NOT_FOUND) {
      err = this.appNotification.notFound(errorField);
    }

    if (status === HttpStatus.FORBIDDEN) {
      err = this.appNotification.forbidden(errorField);
    }

    if (status === HttpStatus.CONFLICT) {
      err = this.appNotification.conflict(errorField);
    }

    response.status(status).json(err);
  }
}

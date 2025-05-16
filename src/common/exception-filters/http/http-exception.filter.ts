import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export class ErrorFieldExceptionDto {
  @ApiProperty()
  message: string;
  @ApiProperty()
  field: string;
  @ApiProperty({ enum: EXCEPTION_KEYS_ENUM })
  errorKey: EXCEPTION_KEYS_ENUM;
}

export class ValidationErrorsDto {
  errorsMessages: ErrorFieldExceptionDto[];
}

export class BadRequestExceptionDto {
  @ApiProperty()
  message: string;
  @ApiProperty({ example: 400 })
  statusCode: number;
  @ApiProperty({ isArray: true, nullable: true, type: ErrorFieldExceptionDto })
  errorField: ErrorFieldExceptionDto[] | null;
}

const isBadRequestError = (error: any): error is ErrorFieldExceptionDto => {
  return (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    'field' in error &&
    'errorKey' in error
  );
};

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const isHttpInstance = exception instanceof HttpException;

    if (isHttpInstance) return this.handleHttp(exception, response);

    this.handleOther(exception, response);
  }

  handleHttp(exception: HttpException, response: Response): void {
    const status = exception.getStatus();

    const res: ValidationErrorsDto | ErrorFieldExceptionDto | string | object =
      exception.getResponse();

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

    const errorResponse: BadRequestExceptionDto = {
      message: exception?.message || 'An unexpected error occurred',
      statusCode: status,
      errorField,
    };

    response.status(status).json(errorResponse);
  }

  handleOther(exception: any, response: Response): void {
    const errorResponse: BadRequestExceptionDto = {
      message: exception?.message || 'An unexpected error occurred',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorField: null,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}

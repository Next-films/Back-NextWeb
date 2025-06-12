import { Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  ErrorFieldExceptionDto,
  isBadRequestError,
  RequestExceptionDto,
} from '@/common/exception-filters/http/http-exception.filter';
import { Observable, throwError } from 'rxjs';
import { RpcUnauthorizedException } from '@/common/exception-filters/rpc/exceptions/rpc-unauthorized.exception';

@Catch(RpcException)
export class RpcExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown): Observable<never> {
    let status = this.getStatus(exception);
    let message: string | object = 'An unexpected error occurred';
    let errorField: ErrorFieldExceptionDto[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const response = exception.getResponse?.();

      const { msg, fields } = this.extractError(response);
      message = msg;
      errorField = fields;
    } else if (exception instanceof RpcException) {
      const rawError = exception.getError();
      const { msg, fields, code } = this.extractError(rawError);
      message = msg;
      errorField = fields;
      status = code ?? status;
    } else if (typeof exception === 'string') {
      message = exception;
    } else if (typeof exception === 'object' && exception !== null) {
      const { msg, fields, code } = this.extractError(exception);
      message = msg;
      errorField = fields;
      status = code ?? status;
    }

    const errorResponse: RequestExceptionDto = {
      statusCode: status,
      message: typeof message === 'string' ? message : 'An unexpected error occurred',
      errorField,
    };

    return throwError(() => new RpcException(errorResponse));
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof RpcUnauthorizedException) {
      return HttpStatus.UNAUTHORIZED;
    } else if (exception instanceof RpcException) {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    } else {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private extractError(res: unknown): {
    msg: string;
    fields: ErrorFieldExceptionDto[] | null;
    code?: number;
  } {
    if (typeof res === 'string') {
      return { msg: res, fields: null };
    }

    if (typeof res === 'object' && res !== null) {
      const obj = res as any;
      const msg = obj.message ?? 'An unexpected error occurred';
      const code = obj.statusCode ?? undefined;

      if (Array.isArray(obj)) {
        return { msg, fields: obj, code };
      }

      if ('errorsMessages' in obj) {
        return { msg, fields: obj.errorsMessages, code };
      }

      if ('field' in obj && 'message' in obj) {
        return { msg, fields: [obj], code };
      }

      if (isBadRequestError(obj)) {
        return { msg, fields: [obj], code };
      }

      return { msg, fields: null, code };
    }

    return { msg: 'An unexpected error occurred', fields: null };
  }
}

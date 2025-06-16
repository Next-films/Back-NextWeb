import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { Request } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { RmqAuthPayload } from '@/common/infrastructure/rmq/types';
import { RpcUnauthorizedException } from '@/common/exception-filters/rpc/exceptions/rpc-unauthorized.exception';
import { ApiCinemaAccessTokenPayload } from '@/external-auth/domain/types';

export const API_CINEMA_RMQ_ACCESS_TOKEN_GUARD_NAME = 'api-cinema-rmq-jwt-access-token';

export class ApiCinemaRmqAccessTokenGuard extends AuthGuard(
  API_CINEMA_RMQ_ACCESS_TOKEN_GUARD_NAME,
) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rpc = context.switchToRpc();
    const data: RmqAuthPayload<any> = rpc.getData();

    const request: Partial<Request> = {
      headers: {
        authorization: `Bearer ${data?.token}`,
      },
    };

    context.switchToHttp = (): HttpArgumentsHost =>
      ({
        getRequest: (): any => request,
        getResponse: () => ({}),
      }) as any;

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch {
      throw new RpcUnauthorizedException({
        field: 'token',
        message: 'Unauthorized',
        errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
      });
    }
  }

  handleRequest<TUser = ApiCinemaAccessTokenPayload>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ||
        new RpcUnauthorizedException({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        })
      );
    }

    return user;
  }
}

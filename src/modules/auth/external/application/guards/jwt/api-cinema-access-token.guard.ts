import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ApiCinemaAccessTokenPayload } from '@/external-auth/domain/types';

export const API_CINEMA_ACCESS_TOKEN_GUARD_NAME = 'api-cinema-jwt-access-token';

export class ApiCinemaAccessTokenGuard extends AuthGuard(API_CINEMA_ACCESS_TOKEN_GUARD_NAME) {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = ApiCinemaAccessTokenPayload>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          field: 'token',
          message: 'Unauthorized',
          errorKey: EXCEPTION_KEYS_ENUM.UNAUTHORIZED,
        })
      );
    }

    return user as TUser;
  }
}

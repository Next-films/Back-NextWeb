import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export const ADMIN_ACCESS_TOKEN_GUARD_NAME = 'admin-jwt-access-token';

export class AdminAccessTokenGuard extends AuthGuard(ADMIN_ACCESS_TOKEN_GUARD_NAME) {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = AdminAccessTokenPayload>(err: any, user: TUser): TUser {
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

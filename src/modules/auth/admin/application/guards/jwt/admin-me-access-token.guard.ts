import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { AdminMeOutputModel } from '@/admin-auth/api/dtos/output/admin-me.output.model';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export const ADMIN_ME_ACCESS_TOKEN_GUARD_NAME = 'admin-me-jwt-access-token';

export class AdminMeAccessTokenGuard extends AuthGuard(ADMIN_ME_ACCESS_TOKEN_GUARD_NAME) {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = AdminMeOutputModel>(err: any, user: TUser): TUser {
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

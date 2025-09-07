import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { AdminAccessTokenPayload } from '@/admin-auth/domain/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export const ADMIN_ACCESS_TOKEN_BY_ROLE_ONLY_ADMIN_GUARD_NAME =
  'admin-jwt-access-token-by-role-only-admin';

export class AdminAccessTokenByRoleOnlyAdminGuard extends AuthGuard(
  ADMIN_ACCESS_TOKEN_BY_ROLE_ONLY_ADMIN_GUARD_NAME,
) {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = AdminAccessTokenPayload>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ||
        new ForbiddenException({
          field: 'id',
          message: 'No access',
          errorKey: EXCEPTION_KEYS_ENUM.NO_ACCESS,
        })
      );
    }

    return user as TUser;
  }
}

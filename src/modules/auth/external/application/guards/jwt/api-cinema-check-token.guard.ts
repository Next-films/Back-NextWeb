import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ExternalApiTokenCheckOutputDto } from '@/external-auth/api/dtos/output/external-api-token-check.output.dto';

export const API_CINEMA_CHECK_TOKEN_GUARD_NAME = 'api-cinema-check-jwt-access-token';

export class ApiCinemaCheckAccessTokenGuard extends AuthGuard(API_CINEMA_CHECK_TOKEN_GUARD_NAME) {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = ExternalApiTokenCheckOutputDto>(err: any, user: TUser): TUser {
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

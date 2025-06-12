import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtExpirationUtil {
  getJwtExp(exp: ExternalApiTokenExpAtEnum): number | null {
    switch (exp) {
      case ExternalApiTokenExpAtEnum['1D']:
        return 60 * 60 * 24;
      case ExternalApiTokenExpAtEnum['1W']:
        return 60 * 60 * 24 * 7;
      case ExternalApiTokenExpAtEnum['1M']:
        return 60 * 60 * 24 * 30;
      case ExternalApiTokenExpAtEnum['3M']:
        return 60 * 60 * 24 * 30 * 3;
      case ExternalApiTokenExpAtEnum['6M']:
        return 60 * 60 * 24 * 30 * 6;
      case ExternalApiTokenExpAtEnum['1Y']:
        return 60 * 60 * 24 * 365;
      case ExternalApiTokenExpAtEnum['F']:
        return null;
      default:
        return null;
    }
  }
}

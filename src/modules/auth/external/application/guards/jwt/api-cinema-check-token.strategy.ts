import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigurationType } from '@/settings/configuration';
import { ExternalApiAuthRepository } from '@/external-auth/infrastructure/external-api-auth.repository';
import { ApiCinemaAccessTokenPayload } from '@/external-auth/domain/types';
import { API_CINEMA_CHECK_TOKEN_GUARD_NAME } from '@/external-auth/application/guards/jwt/api-cinema-check-token.guard';
import {
  ExternalApiTokenCheckOutputDto,
  ExternalApiTokenCheckOutputModelMapper,
} from '@/external-auth/api/dtos/output/external-api-token-check.output.dto';

@Injectable()
export class ApiCinemaCheckAccessTokenStrategy extends PassportStrategy(
  Strategy,
  API_CINEMA_CHECK_TOKEN_GUARD_NAME,
) {
  constructor(
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly externalApiAuthRepository: ExternalApiAuthRepository,
    private readonly externalApiTokenCheckOutputModelMapper: ExternalApiTokenCheckOutputModelMapper,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('apiSettings', { infer: true }).EXTERNAL_ACCESS_JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: ApiCinemaAccessTokenPayload,
  ): Promise<ExternalApiTokenCheckOutputDto | null> {
    const authHeader = req.headers.authorization;
    const rawToken = authHeader?.split(' ')[1];

    if (!rawToken) return null;

    const { name } = payload;
    const token = await this.externalApiAuthRepository.getTokenByName(name);

    if (!token) return null;

    const [rawHeader, rawPayload] = rawToken.split('.');

    if (token.token !== `${rawHeader}.${rawPayload}`) return null;

    return this.externalApiTokenCheckOutputModelMapper.mapToken(token);
  }
}

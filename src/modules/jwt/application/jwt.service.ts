import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { JWTTokenOptions } from '@/jwt-module/domain/types';

@Injectable()
export class JwtMService {
  constructor(private readonly jwtService: JwtService) {}

  async createAccessTokenJWT<T extends object>(
    payload: T,
    options: JWTTokenOptions,
  ): Promise<string> {
    return await this.jwtService.signAsync(payload, options);
  }

  async createRefreshTokenJWT<T extends object>(
    payload: T,
    options: JWTTokenOptions,
  ): Promise<string> {
    return await this.jwtService.signAsync(payload, options);
  }

  async verifyAccessToken<T>(token: string, secret: string): Promise<T | null> {
    try {
      return (await this.jwtService.verifyAsync(token, {
        secret: secret,
      })) as T;
    } catch {
      return null;
    }
  }

  async verifyRefreshToken<T>(token: string, secret: string): Promise<T | null> {
    try {
      return (await this.jwtService.verifyAsync(token, {
        secret: secret,
      })) as T;
    } catch {
      return null;
    }
  }

  generateDeviceId(id: number): string {
    return `${randomUUID()}-${id}`;
  }
}

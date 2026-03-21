import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

@Injectable()
export class TelegramStartInternalTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<ConfigurationType, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string> }>();
    const authHeader = request.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const apiSettings = this.configService.get('apiSettings', { infer: true });
    const expectedToken = (apiSettings.TELEGRAM_GATEWAY_TOKEN || '').trim();

    return expectedToken.length > 0 && token === expectedToken;
  }
}

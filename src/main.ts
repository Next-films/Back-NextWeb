import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { applySettings } from '@/settings/apply.settings';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const configService = app.get(ConfigService<ConfigurationType, true>);
  const apiSettings = configService.get('apiSettings', { infer: true });
  const logger: LoggerService = await app.resolve(LoggerService);

  const PORT = apiSettings.PORT;

  await applySettings(app);
  await app.listen(PORT || 4000);

  console.log('TEST');

  logger.setContext('App');
  logger.log(`App started on port ${PORT}`, bootstrap.name);
}
bootstrap();

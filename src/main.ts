import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { applySettings } from '@/settings/apply.settings';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const configService = app.get(ConfigService<ConfigurationType, true>);
  const apiSettings = configService.get('apiSettings', { infer: true });
  const logger: LoggerService = await app.resolve(LoggerService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [apiSettings.RMQ_URI],
      queue: apiSettings.CINEMA_SERVICE_RMQ_QUEUE_NAME,
      queueOptions: { durable: false },
    },
  });

  const PORT = apiSettings.PORT;

  await applySettings(app);
  await app.startAllMicroservices();
  await app.listen(PORT || 4000);

  logger.setContext('App');
  logger.log(`App started on port ${PORT}`, bootstrap.name);
}
bootstrap();

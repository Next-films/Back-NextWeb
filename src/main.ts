import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { applySettings } from '@/settings/apply.settings';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const configService = app.get(ConfigService<ConfigurationType, true>);
  const modeService = app.get(DownloaderTransportModeService);
  const apiSettings = configService.get('apiSettings', { infer: true });
  const logger: LoggerService = await app.resolve(LoggerService);

  const isRmqEnabled = configService.get('businessRulesSettings', { infer: true }).IS_RMQ_ENABLE;

  if (isRmqEnabled) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [apiSettings.RMQ_URI],
        queue: apiSettings.CINEMA_SERVICE_RMQ_QUEUE_NAME,
        queueOptions: { durable: false },
      },
    });
  }

  const PORT = apiSettings.PORT;

  applySettings(app);
  if (isRmqEnabled) {
    try {
      await app.startAllMicroservices();
      modeService.markRmqSuccess();
    } catch (error) {
      logger.warn('RMQ transport start failed. Fallback to HTTP transport mode.', bootstrap.name);
      logger.error(error, bootstrap.name);
      modeService.markRmqFailureAndFallbackToHttp();
    }
  }
  await app.listen(PORT || 4000);

  logger.setContext('App');
  logger.log(`App started on port ${PORT}`, bootstrap.name);
}
bootstrap();

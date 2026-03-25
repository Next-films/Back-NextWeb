import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { applySettings } from '@/settings/apply.settings';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

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
      await withTimeout(
        app.startAllMicroservices(),
        15_000,
        'RMQ transport start timeout. Fallback to HTTP transport mode.',
      );
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
bootstrap().catch(error => {
  // Ensure CI/CD logs include the startup failure reason.
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});

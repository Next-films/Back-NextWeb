import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { applySettings } from '@/settings/apply.settings';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DownloaderTransportModeService } from '@/common/services/downloader-transport-mode.service';
import express from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });

  // DEBUG: scan raw request body for WebM signature to detect corruption point
  app.use((req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      const rawChunks: Buffer[] = [];
      let found = false;
      const WEBM_SIG = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

      const origOn = req.on.bind(req);
      req.on = function (event, listener) {
        if (event === 'data' && !found) {
          return origOn('data', chunk => {
            if (!found && Buffer.isBuffer(chunk)) {
              rawChunks.push(chunk);
              const combined = Buffer.concat(rawChunks);
              const idx = combined.indexOf(WEBM_SIG);
              if (idx !== -1) {
                found = true;
                const after = combined.subarray(idx, idx + 20);
                console.log(
                  `[RAW-BODY-DEBUG] WebM signature found at offset ${idx}, next 20 bytes: ${after.toString(
                    'hex',
                  )}`,
                );
                // Check if byte after 1a45dfa3 is 9f (clean) or ef (corrupted)
                if (combined[idx + 4] === 0xef) {
                  console.log(
                    '[RAW-BODY-DEBUG] >>> CORRUPTED in raw HTTP body! Browser sends bad data',
                  );
                } else {
                  console.log(
                    '[RAW-BODY-DEBUG] >>> CLEAN in raw HTTP body. Corruption is in busboy/multer',
                  );
                }
              }
            }
            listener(chunk);
          });
        }
        return origOn(event, listener);
      };
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
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
void bootstrap();

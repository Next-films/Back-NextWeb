import { INestApplication } from '@nestjs/common';
import {
  ApplicationNotification,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import {
  CreateConverterLogCommand,
  CreateConverterLogCommandHandler,
} from '@/converter-logs/application/handlers/create-converter-log.handler';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { UploadedLogFilePayloadDto } from '@/converter-logs/domain/types';
import { ConverterLogsTaskService } from '@/converter-logs/application/converter-logs.task.service';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { subMonths } from 'date-fns';
import { initTestSettings } from '../../../test/test-init-settings';

describe('ConverterLogsTaskService (integration)', () => {
  let app: INestApplication;
  let handler: CreateConverterLogCommandHandler;
  let service: ConverterLogsTaskService;
  let testService: TestService;
  let converterLogsRepository: ConverterLogsRepository;
  let downloaderServiceAdapter: DownloaderServiceAdapter;
  let applicationNotification: ApplicationNotification;

  const logData: UploadedLogFilePayloadDto = {
    movieKpId: '12345',
    keys: ['https://some.com/key1.log', 'https://some.com/key2.log'],
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(CreateConverterLogCommandHandler);
    service = app.get(ConverterLogsTaskService);
    converterLogsRepository = app.get(ConverterLogsRepository);
    downloaderServiceAdapter = app.get(DownloaderServiceAdapter);
    applicationNotification = app.get(ApplicationNotification);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should clear expired logs', async () => {
    const result = await handler.execute(new CreateConverterLogCommand(logData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const logs = await converterLogsRepository.getLogs(0, 10);
    expect(logs).toBeDefined();
    expect(logs).toHaveLength(2);

    const converterLogsRepositorySpy = jest
      .spyOn(converterLogsRepository, 'getExpiredLogs')
      .mockResolvedValue([
        {
          id: 2,
          name: 'key2.log',
          movieKpId: '12345',
          url: 'https://some.com/key2.log',
          createdAt: subMonths(new Date(), 2),
        },
      ]);

    service.clearLogsTask();

    await testService.delay(2000);

    try {
      expect(converterLogsRepositorySpy).toHaveBeenCalledTimes(1);
    } finally {
      converterLogsRepositorySpy.mockRestore();
    }

    const logs2 = await converterLogsRepository.getLogs(0, 10);
    expect(logs2).toBeDefined();
    expect(logs2).toHaveLength(1);
  });

  it('should not clear expired logs, rmq error', async () => {
    const result = await handler.execute(new CreateConverterLogCommand(logData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const logs = await converterLogsRepository.getLogs(0, 10);
    expect(logs).toBeDefined();
    expect(logs).toHaveLength(2);

    const downloaderServiceAdapterSpy = jest
      .spyOn(downloaderServiceAdapter, 'clearLogs')
      .mockResolvedValue(applicationNotification.internalServerError());

    const converterLogsRepositorySpy = jest
      .spyOn(converterLogsRepository, 'getExpiredLogs')
      .mockResolvedValue([
        {
          id: 1,
          name: 'key1.log',
          movieKpId: '12345',
          url: 'https://some.com/key1.log',
          createdAt: new Date(),
        },
        {
          id: 2,
          name: 'key2.log',
          movieKpId: '12345',
          url: 'https://some.com/key2.log',
          createdAt: subMonths(new Date(), 2),
        },
      ]);

    service.clearLogsTask();

    await testService.delay(2000);

    try {
      expect(converterLogsRepositorySpy).toHaveBeenCalledTimes(1);
      expect(downloaderServiceAdapterSpy).toHaveBeenCalledTimes(2);
    } finally {
      converterLogsRepositorySpy.mockRestore();
      downloaderServiceAdapterSpy.mockRestore();
    }

    const logs2 = await converterLogsRepository.getLogs(0, 10);
    expect(logs2).toBeDefined();
    expect(logs2).toHaveLength(2);
  }, 15000);
});

import { INestApplication } from '@nestjs/common';
import { AppNotificationResultEnum } from '@/common/utils/app-notification.util';
import { TestService } from 'test/test.service';
import { initTestSettings } from '../../../../test/test-init-settings';
import {
  CreateConverterLogCommand,
  CreateConverterLogCommandHandler,
} from '@/converter-logs/application/handlers/create-converter-log.handler';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { UploadedLogFilePayloadDto } from '@/converter-logs/domain/types';

describe('CreateConverterLogCommandHandler (integration)', () => {
  let app: INestApplication;
  let handler: CreateConverterLogCommandHandler;
  let testService: TestService;
  let converterLogsRepository: ConverterLogsRepository;

  const logData: UploadedLogFilePayloadDto = {
    movieKpId: '12345',
    keys: ['https://some.com/key1.log', 'https://some.com/key2.log'],
  };

  beforeAll(async () => {
    const { app: initApp, testService: initTestService } = await initTestSettings();
    app = initApp;
    testService = initTestService;

    handler = app.get(CreateConverterLogCommandHandler);
    converterLogsRepository = app.get(ConverterLogsRepository);
  });

  beforeEach(async () => {
    await testService.clearDb();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create new log entity', async () => {
    const result = await handler.execute(new CreateConverterLogCommand(logData));

    expect(result.appResult).toBe(AppNotificationResultEnum.Success);

    const logs = await converterLogsRepository.getLogs(0, 10);
    expect(logs).toBeDefined();
    expect(logs).toHaveLength(2);
  });
});

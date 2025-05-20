import { INestApplication } from '@nestjs/common';
import { TestService } from './test.service';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { applySettings } from '@/settings/apply.settings';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { DataSource } from 'typeorm';

export interface ITestSettings {
  app: INestApplication;
  testService: TestService;
  baseUri: string;
}
export const initTestSettings = async (): Promise<ITestSettings> => {
  const testingModuleBuilder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  //setGlobalMock(testingModuleBuilder);

  const testingAppModule: TestingModule = await testingModuleBuilder.compile();
  const app: INestApplication = testingAppModule.createNestApplication();

  await applySettings(app);

  await app.init();
  const dataSource = app.get<DataSource>(DataSource);

  const testService: TestService = new TestService(dataSource);
  const configService = app.get(ConfigService<ConfigurationType, true>);
  const apiSettings = configService.get('apiSettings', { infer: true });

  const globalPrefix = apiSettings.GLOBAL_PREFIX;
  const baseUri = globalPrefix ? `/${globalPrefix}/` : '/';

  return { app, testService, baseUri };
};

// const setGlobalMock = async (testingModuleBuilder: TestingModuleBuilder) => {
//   testingModuleBuilder.overrideProvider().useClass();
// };

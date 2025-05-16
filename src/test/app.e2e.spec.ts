import { INestApplication } from '@nestjs/common';
import { initTestSettings } from './test-init-settings';

describe('App init test', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const createdApp = await initTestSettings();
    app = createdApp.app;
  });

  it('/ (GET)', () => {
    console.log('start test app:', app);
  });
});

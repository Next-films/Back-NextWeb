import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiSettingsType, ConfigurationType, SwaggerSettingsType } from '@/settings/configuration';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as expressBasicAuth from 'express-basic-auth';
import { COOKIE_REFRESH_TOKEN_NAME } from '@/common/constants/cookie-options.constants';
import { validationExceptionFactory } from '@/common/pipes/validation-option.pipe';
import { HttpExceptionsFilter } from '@/common/exception-filters/http/http-exception.filter';

export const applySettings = async (app: INestApplication): Promise<void> => {
  /*
    Prepare
  */
  const configService = app.get(ConfigService<ConfigurationType, true>);
  const apiSettings = configService.get('apiSettings', { infer: true });
  const swaggerSettings = configService.get('swaggerSettings', { infer: true });
  const envSetting = configService.get('environmentSettings', { infer: true });
  const globalPrefix = apiSettings.GLOBAL_PREFIX;

  const origin = getSettingsForCors(apiSettings);
  const corsOptions: CorsOptions = getCorsOptions(origin);
  /*
      Apply
  */

  setCors(app, corsOptions);

  setCookieParser(app);

  setGlobalPrefix(app, globalPrefix);

  setSwagger(app, swaggerSettings, globalPrefix, envSetting.isDevelopment);

  setGlobalFilter(app);

  setGlobalPipe(app);
};

const setSwagger = (
  app: INestApplication,
  swaggerSettings: SwaggerSettingsType,
  globalPrefix: string,
  isDev: boolean,
): void => {
  const SWAGGER_USER = swaggerSettings.SWAGGER_USER;
  const SWAGGER_PASSWORD = swaggerSettings.SWAGGER_PASSWORD;
  const SWAGGER_PATH = swaggerSettings.SWAGGER_PATH;
  const SWAGGER_SERVERS_URLS = swaggerSettings.SWAGGER_SERVERS_URLS.split(',');

  const swaggerUrl = globalPrefix ? `${globalPrefix}/${SWAGGER_PATH}` : SWAGGER_PATH;

  if (!isDev) {
    app.use(
      `/${swaggerUrl}`,
      expressBasicAuth({
        challenge: true,
        users: { [SWAGGER_USER]: SWAGGER_PASSWORD },
      }),
    );
  }

  const config = new DocumentBuilder()
    .setTitle('Next film backend')
    .setVersion('1.0')
    .addCookieAuth(COOKIE_REFRESH_TOKEN_NAME, {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .addBearerAuth({ bearerFormat: 'JWT', scheme: 'bearer', type: 'http' });

  SWAGGER_SERVERS_URLS.forEach((url: string): void => {
    config.addServer(url);
  });

  const document = SwaggerModule.createDocument(app, config.build());

  SwaggerModule.setup(swaggerUrl, app, document);
};

const setGlobalPipe = (app: INestApplication): void => {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );
};

const setGlobalFilter = (app: INestApplication): void => {
  app.useGlobalFilters(new HttpExceptionsFilter());
};

const getSettingsForCors = (apiSettings: ApiSettingsType): string[] => {
  return apiSettings.FRIEND_FRONT_URLS?.split(',');
};

const getCorsOptions = (origin: string[]): CorsOptions => ({
  origin,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'Authorization'],
  exposedHeaders: ['Authorization'],
  methods: 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
});

const setCookieParser = (app: INestApplication): void => {
  app.use(cookieParser());
};

const setCors = (app: INestApplication, corsOptions: CorsOptions): void => {
  app.enableCors(corsOptions);
};

const setGlobalPrefix = (app: INestApplication, prefix: string): void => {
  app.setGlobalPrefix(prefix);
};

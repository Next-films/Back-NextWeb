import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PublicAppModule } from './public-app.module';
import { validatePublicEnvironment } from './public-config.service';
import { HttpExceptionsFilter } from '@/common/exception-filters/http/http-exception.filter';

export async function bootstrapPublic(): Promise<void> {
  validatePublicEnvironment(process.env);
  const app = await NestFactory.create(PublicAppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (
      process.env.PUBLIC_FRONT_ORIGINS || 'https://next-films.ru,https://www.next-films.ru'
    ).split(','),
    methods: ['GET', 'HEAD', 'OPTIONS'],
  });
  app.useGlobalFilters(new HttpExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 4000), '0.0.0.0');
}

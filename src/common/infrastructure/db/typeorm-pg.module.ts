import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';

export const typeOrmModule = TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService<ConfigurationType, true>) => {
    const dbSettings = configService.get('databaseSettings', {
      infer: true,
    });

    const database = dbSettings.POSTGRES_DB;
    const synchronize = dbSettings.SYNCHRONIZE_DB;
    const logging = dbSettings.LOGGING_DB;
    const POSTGRES_URL = dbSettings.POSTGRES_URL;

    const hostConnection = !POSTGRES_URL
      ? {
          host: dbSettings.POSTGRES_HOST,
          port: dbSettings.POSTGRES_PORT,
          username: dbSettings.POSTGRES_USER,
          password: dbSettings.POSTGRES_PASSWORD,
        }
      : {
          url: POSTGRES_URL,
        };

    return {
      type: 'postgres',
      ...hostConnection,
      autoLoadEntities: true,
      database,
      synchronize,
      logger: 'advanced-console',
      logging,
    };
  },
  inject: [ConfigService],
});

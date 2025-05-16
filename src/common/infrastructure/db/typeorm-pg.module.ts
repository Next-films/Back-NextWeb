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
    return {
      type: 'postgres',
      host: dbSettings.POSTGRES_HOST,
      port: dbSettings.POSTGRES_PORT,
      username: dbSettings.POSTGRES_USER,
      password: dbSettings.POSTGRES_PASSWORD,
      autoLoadEntities: true,
      database,
      synchronize,
      logger: 'advanced-console',
      logging,
    };
  },
  inject: [ConfigService],
});

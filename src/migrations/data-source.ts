import { DataSource } from 'typeorm';
import { EnvironmentVariable } from '@/settings/configuration';
import { DatabaseSettings } from '../settings/settings-type/database.settings';

const dbSettings = new DatabaseSettings(process.env as EnvironmentVariable);

const connectionOptions = dbSettings.POSTGRES_URL
  ? {
      url: dbSettings.POSTGRES_URL,
    }
  : {
      host: dbSettings.POSTGRES_HOST,
      port: dbSettings.POSTGRES_PORT,
      username: dbSettings.POSTGRES_USER,
      password: dbSettings.POSTGRES_PASSWORD,
    };

const dataSource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  database: dbSettings.POSTGRES_DB,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default dataSource;

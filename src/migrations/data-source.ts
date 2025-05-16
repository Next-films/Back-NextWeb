import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { EnvironmentVariable } from '@/settings/configuration';
import { DatabaseSettings } from '../settings/settings-type/database.settings';
dotenv.config({ path: 'src/.env.dev' });

const dbSettings = new DatabaseSettings(process.env as EnvironmentVariable);
const dataSource = new DataSource({
  type: 'postgres',
  host: dbSettings.POSTGRES_HOST,
  port: dbSettings.POSTGRES_PORT,
  username: dbSettings.POSTGRES_USER,
  password: dbSettings.POSTGRES_PASSWORD,
  database: dbSettings.POSTGRES_DB,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default dataSource;

import * as process from 'node:process';
import { ValidateNested, validateSync } from 'class-validator';
import * as dotenv from 'dotenv';
import { Environments, EnvironmentSettings } from '@/settings/settings-type/environments.settings';
import { DatabaseSettings } from '@/settings/settings-type/database.settings';
import { BusinessRulesSettings } from '@/settings/settings-type/business-rules.settings';
import { ApiSettings } from '@/settings/settings-type/api.settings';
import { LoggerSettings } from '@/settings/settings-type/logger.setting';
import { SwaggerSettings } from '@/settings/settings-type/swagger.settings';

export const loadEnv = (): string[] => {
  const env = process.env.ENV as Environments;

  const root = './';
  switch (env) {
    case Environments.DEVELOPMENT: {
      return [`${root}.env.dev`, `${root}.env`];
    }
    case Environments.TEST: {
      return [`${root}.env.test`, `${root}.env`];
    }
    case Environments.STAGING: {
      return [`${root}.env.staging`, `${root}.env`];
    }
    default: {
      return [];
    }
  }
};

dotenv.config({ path: loadEnv() });

export type EnvironmentVariable = { [key: string]: string };

export type ConfigurationType = Configuration;
export type ApiSettingsType = ConfigurationType['apiSettings'];
export type DatabaseSettingsType = ConfigurationType['databaseSettings'];
export type EnvironmentSettingsType = ConfigurationType['environmentSettings'];
export type LoggerSettingsType = ConfigurationType['loggerSettings'];
export type BusinessRulesSettingsType = ConfigurationType['businessRulesSettings'];
export type SwaggerSettingsType = ConfigurationType['swaggerSettings'];

export class Configuration {
  @ValidateNested()
  apiSettings: ApiSettings;

  @ValidateNested()
  databaseSettings: DatabaseSettings;

  @ValidateNested()
  loggerSettings: LoggerSettings;

  @ValidateNested()
  swaggerSettings: SwaggerSettings;

  @ValidateNested()
  environmentSettings: EnvironmentSettings;

  @ValidateNested()
  businessRulesSettings: BusinessRulesSettings;

  private constructor(configuration: Configuration) {
    Object.assign(this, configuration);
  }

  static createConfig(environmentVariables: Record<string, string>): Configuration {
    return new this({
      apiSettings: new ApiSettings(environmentVariables),
      databaseSettings: new DatabaseSettings(environmentVariables),
      loggerSettings: new LoggerSettings(environmentVariables),
      swaggerSettings: new SwaggerSettings(environmentVariables),
      environmentSettings: new EnvironmentSettings(environmentVariables),
      businessRulesSettings: new BusinessRulesSettings(environmentVariables),
    });
  }
}

export function validate(environmentVariables: Record<string, string>) {
  const config = Configuration.createConfig(environmentVariables);

  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return config;
}

export default () => {
  const environmentVariables = process.env as EnvironmentVariable;

  return Configuration.createConfig(environmentVariables);
};

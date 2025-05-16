import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType, EnvironmentSettingsType } from '@/settings/configuration';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';

const customLevels = {
  levels: {
    trace: 5,
    debug: 4,
    info: 3,
    warn: 2,
    error: 1,
    fatal: 0,
  },
};

const timeFormat: string = 'YYYY-MM-DD HH:mm:ss'; // Format for timestamp in log

// Extracting formatting functions for logs from the winston library
const { combine, prettyPrint, timestamp, errors, colorize } = winston.format;

@Injectable()
export class WinstonService {
  private readonly logger: winston.Logger;
  private readonly serviceName: string; // Service name

  constructor(
    private readonly configService: ConfigService<ConfigurationType, true>,
    appName: string, // Service name
  ) {
    const envSettings: EnvironmentSettingsType = this.configService.get('environmentSettings', {
      infer: true,
    });
    this.serviceName = appName;

    const isProduction: boolean = envSettings.isProduction;

    // Configuring transport for console logging
    const consoleTransport: ConsoleTransportInstance = new winston.transports.Console({
      format: combine(
        timestamp({ format: timeFormat }),
        errors({ stack: true }),
        prettyPrint(),
        colorize({ all: true, colors: { trace: 'yellow' } }),
      ),
    });

    const transports: Transport[] = []; // An array of transportites that will be used for logging

    if (!isProduction) {
      transports.push(consoleTransport);
    }

    // In a production environment, you can add additional transports
    if (isProduction) {
      // const httpTransport: HttpTransportInstance = new winston.transports.Http({
      //   host: loggerSettings.HOST,
      //   path: loggerSettings.URL_PATH,
      //   ssl: true,
      // });
      // transports.push(httpTransport);
    }

    // Create a logger with the specified logging levels and protractors
    this.logger = winston.createLogger({
      format: winston.format.timestamp({ format: timeFormat }),
      level: 'trace',
      levels: customLevels.levels,
      transports: transports,
      defaultMeta: { serviceName: this.serviceName },
    });
  }

  trace(message: string, requestId: string | null, functionName?: string, sourceName?: string) {
    this.logger.log('trace', message, {
      sourceName,
      functionName,
      requestId,
    });
  }

  debug(message: string, requestId: string | null, functionName?: string, sourceName?: string) {
    this.logger.debug(message, {
      sourceName,
      functionName,
      requestId,
    });
  }

  info(message: string, requestId: string | null, functionName?: string, sourceName?: string) {
    this.logger.info(message, {
      sourceName,
      functionName,
      requestId,
    });
  }

  warn(message: string, requestId: string | null, functionName?: string, sourceName?: string) {
    this.logger.warn(message, {
      sourceName,
      functionName,
      requestId,
    });
  }

  error(
    message: string,
    requestId: string | null,
    functionName?: string,
    sourceName?: string,
    stack?: string,
  ) {
    this.logger.error(message, {
      sourceName,
      functionName,
      requestId,
      stack,
    });
  }

  fatal(
    message: string,
    requestId: string | null,
    functionName?: string,
    sourceName?: string,
    stack?: string,
  ) {
    this.logger.log('fatal', message, {
      sourceName,
      functionName,
      requestId,
      stack,
    });
  }
}

import { ConsoleLogger, ConsoleLoggerOptions, Injectable, Scope } from '@nestjs/common';
import { WinstonService } from '@/common/utils/logger/winston.service';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';
import { REQUEST_ID_KEY } from '@/common/utils/logger/request-context.middleware';
import {ConfigService} from "@nestjs/config";
import {ConfigurationType} from "@/settings/configuration";

/*
 Scope.TRANSIENT indicates that the LoggerService instance
  will be created anew every time it is injected
*/
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  /*
     1. context - context string for logging (for example, module or class name).
     2. options - settings for logging.
     3. winstonLogger - a logging service using the Winston library.
     4. asyncLocalStorageService - service for working with asynchronous data storage.
   */
  private readonly isLogging: boolean = true;
  constructor(
    context: string,
    options: ConsoleLoggerOptions,
    private winstonLogger: WinstonService,
    private asyncLocalStorageService: AsyncLocalStorageService,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    // Calling the constructor of the parent class ConsoleLogger with the passed context and settings.
    super(context, {
      ...options, // expand the passed logging parameters
      logLevels: ['verbose', 'debug', 'log', 'warn', 'error'],
    });

    this.isLogging = this.configService.get('loggerSettings', {infer: true}).LOGGING;
  }

  // Method to get the request ID from an asynchronous context.
  private getRequestId(): string | null {
    return this.asyncLocalStorageService.getStore()?.get(REQUEST_ID_KEY) || null;
  }

  // Method for getting the context of the logging source (for example, the name of a class or module).
  private getSourceContext(): string | undefined {
    return this.context;
  }

  // Method to pop the error stack (if an error is reported).
  private getStack(error: any): string | undefined {
    const stack = error?.stack;

    if (stack) {
      return `${stack?.split('\n')[1]}`;
    }
  }

  trace(message: string, functionName?: string) {
    if (!this.isLogging) return

    super.verbose(message, this.getSourceContext() || functionName);

    this.winstonLogger.trace(message, this.getRequestId(), functionName, this.getSourceContext());
  }

  debug(message: string, functionName?: string) {
    if (!this.isLogging) return

    super.debug(message, this.getSourceContext() || functionName);

    this.winstonLogger.debug(message, this.getRequestId(), functionName, this.getSourceContext());
  }

  log(message: string, functionName?: string) {
    if (!this.isLogging) return

    super.log(message, this.getSourceContext() || functionName);

    this.winstonLogger.info(message, this.getRequestId(), functionName, this.getSourceContext());
  }

  warn(message: string, functionName?: string) {
    if (!this.isLogging) return

    super.warn(message, this.getSourceContext() || functionName);

    this.winstonLogger.warn(message, this.getRequestId(), functionName, this.getSourceContext());
  }

  error(error: any, functionName?: string) {
    if (!this.isLogging) return

    const jsonError = error instanceof Error ? JSON.stringify(error) : error;
    const stack = this.getStack(error);

    const fullErrorMessage = `${
      error?.message ? `msg: ${error?.message}; ` : ''
    } fullError: ${jsonError}`;

    super.error(error, stack, this.getSourceContext() || functionName);

    this.winstonLogger.error(
      fullErrorMessage,
      this.getRequestId(),
      functionName,
      this.getSourceContext(),
      stack,
    );
  }
}

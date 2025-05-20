import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, Request, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorageService } from '@/common/utils/logger/als.service';

// Constant used as a key to store the request ID in asynchronous storage
export const REQUEST_ID_KEY = 'requestId';

@Injectable()
export class RequestsContextMiddleware implements NestMiddleware {
  constructor(private readonly asyncLocalStorageService: AsyncLocalStorageService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    let requestId = req.headers['x-request-id'] as string;
    const date: Date = new Date();
    const format: string = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
    if (!requestId) {
      requestId = `${format}-${randomUUID()}`;
      req.headers['x-request-id'] = requestId;
    }
    res.setHeader('X-Request-Id', requestId);

    // Initializing asynchronous storage
    this.asyncLocalStorageService.start(() => {
      // Getting the current storage from an asynchronous context
      const store: Map<string, any> | undefined = this.asyncLocalStorageService.getStore();

      // If the repository exists, store the request identifier in it
      if (store) {
        store.set(REQUEST_ID_KEY, requestId);
      }

      next();
    });
  }
}

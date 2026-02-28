import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/*
  We create an AsyncLocalStorage instance that will store data in the form Map<string, any> (key-value)
  This data structure will be used to store the asynchronous context, in the context of the request
*/
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

@Injectable()
export class AsyncLocalStorageService {
  // A private field that stores a reference to the created AsyncLocalStorage instance
  private readonly asyncLocalStorage = asyncLocalStorage;

  // accepts a callback that will be executed in the context of the new repository.
  start(callback: () => void) {
    // The run method initializes a new asynchronous store
    this.asyncLocalStorage.run(new Map(), () => {
      callback();
    });
  }

  getStore(): Map<string, any> | undefined {
    return this.asyncLocalStorage.getStore();
  }
}

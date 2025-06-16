export class RmqAuthPayload<T> {
  payload: T;
  token: string;
}

export class RmqPayload<T> {
  payload: T;
}

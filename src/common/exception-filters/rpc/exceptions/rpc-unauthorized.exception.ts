import { RpcException } from '@nestjs/microservices';

export class RpcUnauthorizedException extends RpcException {
  constructor(message: any = 'Unauthorized') {
    super(message);
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { RmqAuthPayload } from '@/common/infrastructure/rmq/types';

export const RpcPayload = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const rpcCtx: RpcArgumentsHost = ctx.switchToRpc();
  const data = rpcCtx.getData<RmqAuthPayload<any>>();
  return data.payload;
});

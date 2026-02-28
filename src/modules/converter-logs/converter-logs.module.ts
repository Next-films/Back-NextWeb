import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConverterLogs } from '@/converter-logs/domain/converter-logs.entity';
import { ConverterLogsRepository } from '@/converter-logs/infrastructure/converter-logs.repository';
import { CreateConverterLogCommandHandler } from '@/converter-logs/application/handlers/create-converter-log.handler';
import { ConverterLogsRpcController } from '@/converter-logs/api/converter-logs-rpc.controller';
import { ConverterLogsTaskService } from '@/converter-logs/application/converter-logs.task.service';
import { ConverterLogsPrivateController } from '@/converter-logs/api/converter-logs-private.controller';

const logProvider = {
  provide: 'ConverterLogs',
  useValue: ConverterLogs,
};

const providers = [logProvider];

const handlers = [CreateConverterLogCommandHandler];

@Module({
  imports: [TypeOrmModule.forFeature([ConverterLogs])],
  controllers: [ConverterLogsRpcController, ConverterLogsPrivateController],
  providers: [ConverterLogsRepository, ...handlers, ...providers, ConverterLogsTaskService],
  exports: [],
})
export class ConverterLogsModule {}

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import {
  DOWNLOAD_SERVICE_RMQ_NAME,
  RMQ_CLIENT_MODULE_NAME,
} from '@/common/constants/rmq.constants';

@Module({})
export class RmqClientModule {
  static register(): DynamicModule {
    return {
      module: RmqClientModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: DOWNLOAD_SERVICE_RMQ_NAME,
          inject: [ConfigService],
          useFactory: (configService: ConfigService<ConfigurationType, true>) => {
            const isEnabled = configService.get('businessRulesSettings', {
              infer: true,
            }).IS_RMQ_ENABLE;

            if (!isEnabled) {
              return null;
            }

            return ClientProxyFactory.create({
              transport: Transport.RMQ,
              options: {
                urls: [configService.get('apiSettings', { infer: true }).RMQ_URI],
                queue: configService.get('apiSettings', { infer: true })
                  .DOWNLOAD_SERVICE_RMQ_QUEUE_NAME,
                queueOptions: {
                  durable: false,
                },
              },
            });
          },
        },
        {
          provide: RMQ_CLIENT_MODULE_NAME,
          useExisting: DOWNLOAD_SERVICE_RMQ_NAME,
        },
      ],
      exports: [DOWNLOAD_SERVICE_RMQ_NAME, RMQ_CLIENT_MODULE_NAME],
    };
  }
}

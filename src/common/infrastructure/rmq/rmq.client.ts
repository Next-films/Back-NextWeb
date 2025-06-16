import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { DOWNLOAD_SERVICE_RMQ_NAME } from '@/common/constants/rmq.constants';

export const rmqClients = ClientsModule.registerAsync([
  {
    name: DOWNLOAD_SERVICE_RMQ_NAME,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService<ConfigurationType, true>) => ({
      transport: Transport.RMQ,
      options: {
        urls: [configService.get('apiSettings', { infer: true }).RMQ_URI],
        queue: configService.get('apiSettings', { infer: true }).DOWNLOAD_SERVICE_RMQ_QUEUE_NAME,
        queueOptions: {
          durable: false,
        },
      },
    }),
  },
]);

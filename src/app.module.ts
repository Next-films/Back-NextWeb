import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { loadEnv, validate } from '@/settings/configuration';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: loadEnv(),
    }),
    CommonModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { loadEnv, validate } from '@/settings/configuration';
import { CommonModule } from '@/common/common.module';
import { CartoonModule } from '@/cartoons/cartoon.module';
import { FilmModule } from '@/films/film.module';
import { SerialModule } from '@/serials/serial.module';
import { AdminModule } from '@/admin/admin.module';
import { AdminAuthModule } from '@/admin-auth/admin-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: loadEnv(),
    }),
    CommonModule,
    CartoonModule,
    FilmModule,
    SerialModule,
    AdminModule,
    AdminAuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

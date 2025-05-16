import { Module } from '@nestjs/common';
import { SerialController } from '@/serials/api/serial.controller';

@Module({
  imports: [],
  controllers: [SerialController],
  providers: [],
  exports: [],
})
export class SerialModule {}

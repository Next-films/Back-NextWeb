import { Module } from '@nestjs/common';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';

@Module({
  imports: [],
  controllers: [],
  providers: [BcryptService],
  exports: [BcryptService],
})
export class BcryptModule {}

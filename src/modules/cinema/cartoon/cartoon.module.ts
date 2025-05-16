import { Module } from '@nestjs/common';
import { CartoonController } from '@/cartoons/api/cartoon.controller';

@Module({
  imports: [],
  controllers: [CartoonController],
  providers: [],
  exports: [],
})
export class CartoonModule {}

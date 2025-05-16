import { Module } from '@nestjs/common';
import { JwtMService } from '@/jwt-module/application/jwt.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [],
  providers: [JwtMService, JwtService],
  exports: [JwtMService],
})
export class JwtModule {}

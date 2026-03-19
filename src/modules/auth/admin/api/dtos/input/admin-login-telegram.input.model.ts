import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';

export class AdminTelegramLoginInputModel {
  @ApiProperty()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  token: string;
}

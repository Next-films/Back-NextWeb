import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TelegramStartInputDto {
  @IsNumber()
  chatId: number;

  @IsOptional()
  @IsString()
  username?: string;
}

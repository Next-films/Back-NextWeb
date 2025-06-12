import { ApiProperty } from '@nestjs/swagger';

export class ExternalApiTokenCreateOutputDto {
  @ApiProperty()
  token: string;
}

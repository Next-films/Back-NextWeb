import { ApiProperty } from '@nestjs/swagger';

export class ExternalApiTokenCreateOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  token: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: Date, nullable: true })
  expAt: Date | null;
}

import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginOutputModel {
  @ApiProperty()
  accessToken: string;
}

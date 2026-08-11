import { ApiProperty } from '@nestjs/swagger';

export class AdminReprocessPremiereAssetsOutputDto {
  @ApiProperty()
  selected: number;

  @ApiProperty()
  processed: number;

  @ApiProperty()
  published: number;

  @ApiProperty()
  moderated: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

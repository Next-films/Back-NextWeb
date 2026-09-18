import { ApiProperty } from '@nestjs/swagger';

export class AdminReprocessPremiereAssetsOutputDto {
  @ApiProperty()
  selected: number;

  @ApiProperty()
  processed: number;

  @ApiProperty()
  trailersUpdated: number;

  @ApiProperty()
  trailersAdded: number;

  @ApiProperty()
  trailersRemoved: number;

  @ApiProperty()
  descriptionsUpdated: number;

  @ApiProperty()
  backgroundsUpdated: number;

  @ApiProperty()
  postersUpdated: number;

  @ApiProperty()
  titlesUpdated: number;

  @ApiProperty()
  unchanged: number;

  @ApiProperty()
  published: number;

  @ApiProperty()
  moderated: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  assetWarnings: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

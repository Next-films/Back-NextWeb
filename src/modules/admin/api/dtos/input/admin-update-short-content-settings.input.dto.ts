import { IsInt, Max, Min } from 'class-validator';

export class AdminUpdateShortContentSettingsInputDto {
  @IsInt()
  @Min(0)
  @Max(20)
  musicVolumePercent: number;
}

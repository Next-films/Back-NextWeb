import { IsInt, IsString, Max, Min, ValidateIf } from 'class-validator';

export class AdminUpdateShortContentClipMusicInputDto {
  /** Null removes the background track and restores the clean rendered audio. */
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  trackId: string | null;

  @IsInt()
  @Min(0)
  @Max(20)
  volumePercent: number;
}

import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class AdminShortContentHighlightsOptionsInputDto {
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  clipSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  count?: number;

  @IsOptional()
  @IsBoolean()
  subtitles?: boolean;

  @IsOptional()
  @IsBoolean()
  keepOriginalAudio?: boolean;
}

export class AdminCreateShortContentHighlightsInputDto {
  @IsIn(['film', 'cartoon', 'serial'])
  contentType: 'film' | 'cartoon' | 'serial';

  @IsInt()
  contentId: number;

  /** Serial only: backend episode id. */
  @IsOptional()
  @IsInt()
  episodeId?: number;

  /** Serial only: season number. */
  @IsOptional()
  @IsInt()
  @Min(0)
  seasonNumber?: number;

  /** Serial only: episode number inside the season; nothing given = first episode with a video. */
  @IsOptional()
  @IsInt()
  @Min(0)
  episodeNumber?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminShortContentHighlightsOptionsInputDto)
  options?: AdminShortContentHighlightsOptionsInputDto;
}

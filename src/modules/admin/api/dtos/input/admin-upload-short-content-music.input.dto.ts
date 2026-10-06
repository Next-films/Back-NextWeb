import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class AdminUploadShortContentMusicInputDto {
  @IsString()
  @Length(1, 120)
  title: string;

  /** Comma-separated labels shown in the library. */
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  moods?: string;

  /** 1 = calm, 5 = very energetic; used by automatic selection. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  energy: number;

  /** Comma-separated film genres used by automatic selection. */
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  genres?: string;

  /** Comma-separated transcript keywords used by automatic selection. */
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  keywords?: string;
}

import { IsBoolean, IsOptional, IsString, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const StringToBoolean = () =>
  Transform(({ value }) => {
    if (value === true || value === false) return value;
    if (typeof value !== 'string') return undefined;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    return undefined;
  });

export class UpdateBannerInputDto {
  @ApiPropertyOptional({ description: 'Link URL that the banner navigates to when clicked' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order for banner position' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Open link in a new tab' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ description: 'Whether the banner is active' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Button image file (will be converted to webp)',
  })
  @IsOptional()
  buttonImageFile?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Button hover video file (will be converted to webm)',
  })
  @IsOptional()
  buttonHoverVideoFile?: Express.Multer.File;
}

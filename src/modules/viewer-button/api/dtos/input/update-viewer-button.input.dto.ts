import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ViewerButtonCategory } from '@/viewer-button/domain/viewer-button.entity';

const StringToBoolean = () =>
  Transform(({ value }) => {
    if (value === true || value === false) return value;
    if (typeof value !== 'string') return undefined;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    return undefined;
  });

export class UpdateViewerButtonInputDto {
  @ApiPropertyOptional({
    enum: ViewerButtonCategory,
    description: 'Target content row for the ALL card',
  })
  @IsOptional()
  @IsEnum(ViewerButtonCategory)
  category?: ViewerButtonCategory;

  @ApiPropertyOptional({ description: 'Link URL that opens on card click' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order for card position' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Open link in a new tab' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({ description: 'Whether the button is active' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Hover video file (will be converted to webm)',
  })
  @IsOptional()
  hoverVideoFile?: Express.Multer.File;
}

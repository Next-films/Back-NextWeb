import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateViewerButtonInputDto {
  @ApiProperty({ enum: ViewerButtonCategory, description: 'Target content row for the ALL card' })
  @IsEnum(ViewerButtonCategory)
  category: ViewerButtonCategory;

  @ApiPropertyOptional({ description: 'Link URL that opens on card click' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order for card position' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Open link in a new tab', default: true })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Hover video file (will be converted to webm)',
  })
  @IsOptional()
  hoverVideoFile?: Express.Multer.File;
}

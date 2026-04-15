import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const ToOptionalBoolean = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === false) return value;

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return undefined;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    }

    return undefined;
  });

export class UpdateHomeSectionsSettingsInputDto {
  @ApiPropertyOptional({ description: 'Visibility flag for films section on homepage' })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  showFilms?: boolean;

  @ApiPropertyOptional({ description: 'Visibility flag for serials section on homepage' })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  showSerials?: boolean;

  @ApiPropertyOptional({ description: 'Visibility flag for cartoons section on homepage' })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  showCartoons?: boolean;
}

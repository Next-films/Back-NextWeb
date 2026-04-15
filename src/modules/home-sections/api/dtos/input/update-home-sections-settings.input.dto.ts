import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
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

export class UpdateHomeSectionsSettingsInputDto {
  @ApiPropertyOptional({ description: 'Visibility flag for films section on homepage' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  showFilms?: boolean;

  @ApiPropertyOptional({ description: 'Visibility flag for serials section on homepage' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  showSerials?: boolean;

  @ApiPropertyOptional({ description: 'Visibility flag for cartoons section on homepage' })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  showCartoons?: boolean;
}

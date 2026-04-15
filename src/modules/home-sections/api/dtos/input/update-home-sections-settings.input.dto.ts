import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHomeSectionsSettingsInputDto {
  @ApiPropertyOptional({ description: 'Visibility flag for films section on homepage' })
  showFilms?: boolean | string | number | null;

  @ApiPropertyOptional({ description: 'Visibility flag for serials section on homepage' })
  showSerials?: boolean | string | number | null;

  @ApiPropertyOptional({ description: 'Visibility flag for cartoons section on homepage' })
  showCartoons?: boolean | string | number | null;
}

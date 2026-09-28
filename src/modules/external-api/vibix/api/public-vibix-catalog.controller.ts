import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { VIBIX_CATALOG_ROUTE } from '@/common/constants/route.constants';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import { VibixMediaType, VibixPublicItem } from '@/external-api/vibix/domain/vibix.types';

@Controller(VIBIX_CATALOG_ROUTE.MAIN)
export class PublicVibixCatalogController {
  constructor(private readonly vibixCatalogService: VibixCatalogService) {}

  @Get(':mediaType')
  getPage(
    @Param('mediaType') mediaType: VibixMediaType,
    @Query('page') page = '1',
    @Query('search') search?: string,
  ) {
    this.assertMediaType(mediaType);
    return this.vibixCatalogService.getPage(mediaType, Number(page) || 1, search);
  }

  // TEMP: отладка полей Vibix, удалить после проверки.
  @Get('debug-raw/:id')
  debugRaw(@Param('id', ParseIntPipe) id: number) {
    return this.vibixCatalogService.debugRaw(id);
  }

  @Get(':mediaType/:id')
  getById(
    @Param('mediaType') mediaType: VibixMediaType,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VibixPublicItem> {
    this.assertMediaType(mediaType);
    return this.vibixCatalogService.getById(id);
  }

  private assertMediaType(value: string): asserts value is VibixMediaType {
    if (!['films', 'serials', 'cartoons'].includes(value)) {
      throw new BadRequestException('Unsupported Vibix media type');
    }
  }
}

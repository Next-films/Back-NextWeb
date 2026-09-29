import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { VIBIX_CATALOG_ROUTE } from '@/common/constants/route.constants';
import { VibixCatalogService } from '@/external-api/vibix/application/vibix-catalog.service';
import {
  VibixMediaType,
  VibixPublicItem,
  VibixSort,
} from '@/external-api/vibix/domain/vibix.types';

@Controller(VIBIX_CATALOG_ROUTE.MAIN)
export class PublicVibixCatalogController {
  constructor(private readonly vibixCatalogService: VibixCatalogService) {}

  // Объявлен до ':mediaType', иначе 'genres' попадёт в тип каталога.
  @Get('genres')
  getGenres() {
    return this.vibixCatalogService.getGenres();
  }

  @Get('top')
  getTopRecent(@Query('limit') limit = '10') {
    return this.vibixCatalogService.getTopRecent(Number(limit));
  }

  @Get(':mediaType')
  getPage(
    @Param('mediaType') mediaType: VibixMediaType,
    @Query('page') page = '1',
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('genre') genre?: string,
  ) {
    this.assertMediaType(mediaType);
    const safeSort: VibixSort = sort === 'popular' ? 'popular' : 'new';
    const safeGenre = genre && /^[\w-]{1,32}$/.test(genre) ? genre : undefined;
    return this.vibixCatalogService.getPage(
      mediaType,
      Number(page) || 1,
      search,
      safeSort,
      safeGenre,
    );
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

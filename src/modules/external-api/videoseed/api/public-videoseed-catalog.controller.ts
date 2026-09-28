import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';

import { VIDEOSEED_CATALOG_ROUTE } from '@/common/constants/route.constants';
import { VideoseedCatalogService } from '@/external-api/videoseed/application/videoseed-catalog.service';
import { VibixMediaType, VibixPublicItem } from '@/external-api/vibix/domain/vibix.types';

@Controller(VIDEOSEED_CATALOG_ROUTE.MAIN)
export class PublicVideoseedCatalogController {
  constructor(private readonly videoseedCatalogService: VideoseedCatalogService) {}

  @Get(':mediaType')
  async search(@Param('mediaType') mediaType: VibixMediaType, @Query('search') search = '') {
    this.assertMediaType(mediaType);
    const items = await this.videoseedCatalogService.search(mediaType, search);
    return { items, pagesCount: items.length > 0 ? 1 : 0, totalCount: items.length };
  }

  @Get(':mediaType/:id')
  getById(
    @Param('mediaType') mediaType: VibixMediaType,
    @Param('id') id: string,
  ): Promise<VibixPublicItem> {
    this.assertMediaType(mediaType);
    if (!/^\d+$/.test(id)) throw new BadRequestException('Invalid Videoseed id');
    return this.videoseedCatalogService.getById(mediaType, id);
  }

  private assertMediaType(value: string): asserts value is VibixMediaType {
    if (!['films', 'serials', 'cartoons'].includes(value)) {
      throw new BadRequestException('Unsupported media type');
    }
  }
}

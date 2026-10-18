import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';

import { KODIK_CATALOG_ROUTE } from '@/common/constants/route.constants';
import { KodikCatalogService } from '@/external-api/kodik/application/kodik-catalog.service';
import { KodikSection } from '@/external-api/kodik/domain/kodik.types';

@Controller(KODIK_CATALOG_ROUTE.MAIN)
export class PublicKodikCatalogController {
  constructor(private readonly catalogService: KodikCatalogService) {}

  @Get(':section')
  getPage(
    @Param('section') section: KodikSection,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
  ) {
    this.assertSection(section);
    return this.catalogService.getPage(section, cursor, search);
  }

  @Get(':section/:id')
  getById(@Param('section') section: KodikSection, @Param('id') id: string) {
    this.assertSection(section);
    return this.catalogService.getById(section, id);
  }

  private assertSection(value: string): asserts value is KodikSection {
    if (!['anime', 'dramas'].includes(value)) {
      throw new BadRequestException('Unsupported Kodik section');
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

@Injectable()
export class PaginationUtil<T = []> {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  pagesCount: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  size: number;

  @ApiProperty()
  items: T;

  create<T = []>(
    totalCount: number,
    pagesCount: number,
    page: number,
    size: number,
    items: T,
  ): PaginationUtil<T> {
    const paginationUtil = new PaginationUtil<T>();

    paginationUtil.totalCount = totalCount;
    paginationUtil.pagesCount = pagesCount;
    paginationUtil.page = page;
    paginationUtil.size = size;
    paginationUtil.items = items;

    return paginationUtil;
  }

  calculatePaginationSkip(page: number, size: number): number {
    return (page - 1) * size;
  }

  calculatePageCount(totalCount: number, size: number): number {
    return Math.ceil(totalCount / size);
  }

  isValidPage(page: number, pagesCount: number, total: number): boolean {
    return page <= pagesCount || (total === 0 && page === 1);
  }
}

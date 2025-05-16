import { Controller } from '@nestjs/common';
import { CARTOONS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';

// TODO:
@ApiTags('Public - cartoons')
@Controller(CARTOONS_ROUTE.MAIN)
export class CartoonController {
  constructor() {}
}

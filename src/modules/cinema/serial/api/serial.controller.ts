import { Controller } from '@nestjs/common';
import { SERIALS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';

// TODO:
@ApiTags('Public - serials')
@Controller(SERIALS_ROUTE.MAIN)
export class SerialController {
  constructor() {}
}

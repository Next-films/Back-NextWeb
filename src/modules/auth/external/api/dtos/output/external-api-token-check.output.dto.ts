import { Injectable } from '@nestjs/common';
import {
  ExternalApiTokenOutputDto,
  ExternalApiTokenOutputModelMapper,
} from '@/admin/api/dtos/output/external-api-tokens.output.dto';

export class ExternalApiTokenCheckOutputDto extends ExternalApiTokenOutputDto {}

@Injectable()
export class ExternalApiTokenCheckOutputModelMapper extends ExternalApiTokenOutputModelMapper {}

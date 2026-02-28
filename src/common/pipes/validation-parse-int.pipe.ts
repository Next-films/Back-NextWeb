import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ArgumentMetadata } from '@nestjs/common/interfaces/features/pipe-transform.interface';

import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

@Injectable()
export class ParseIntPatchPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    const field = metadata?.data || 'id';
    const error = (message: string): never => {
      throw new BadRequestException({
        message,
        field,
        errorKey: EXCEPTION_KEYS_ENUM[field] ?? EXCEPTION_KEYS_ENUM.INCORRECT_INPUT_DATA,
      });
    };

    if (!Number.isSafeInteger(value)) {
      error('The value should be the whole number');
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      error('The value must be a number');
    }

    return parsed;
  }
}

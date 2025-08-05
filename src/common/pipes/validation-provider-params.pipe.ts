import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { TorApiProvidersEnum } from '@/common/types/types';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

@Injectable()
export class ParseProviderPipe implements PipeTransform<string, TorApiProvidersEnum> {
  transform(value: string): TorApiProvidersEnum {
    const enumValues = Object.values(TorApiProvidersEnum);

    if (!enumValues.includes(value as TorApiProvidersEnum)) {
      const fieldKey = 'provider' as keyof typeof EXCEPTION_KEYS_ENUM;
      const errorKey = EXCEPTION_KEYS_ENUM[fieldKey] ?? EXCEPTION_KEYS_ENUM.INCORRECT_INPUT_DATA;

      const errorResponse = {
        errorsMessages: [
          {
            message: `Invalid provider value.`,
            field: fieldKey,
            errorKey,
          },
        ],
      };

      throw new BadRequestException(errorResponse);
    }

    return value as TorApiProvidersEnum;
  }
}

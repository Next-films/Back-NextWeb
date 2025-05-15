import { BadRequestException } from '@nestjs/common';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';

export function validationExceptionFactory(errors: any[]) {
  const errorsMessages: ErrorFieldExceptionDto[] = [];

  for (const error of errors) {
    const firstKey = Object.keys(error.constraints)[0];

    const fieldKey = error.property as keyof typeof EXCEPTION_KEYS_ENUM;
    const errorKey = EXCEPTION_KEYS_ENUM[fieldKey] ?? EXCEPTION_KEYS_ENUM.INCORRECT_INPUT_DATA;

    errorsMessages.push({
      message: error.constraints[firstKey],
      field: error.property,
      errorKey,
    });
  }

  throw new BadRequestException({ errorsMessages });
}

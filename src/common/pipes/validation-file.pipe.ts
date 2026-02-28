import { BadRequestException, ParseFilePipeBuilder } from '@nestjs/common';

import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';

const SIZE_TYPE: string = 'expected size is';
const FILE_TYPE_TYPE: string = 'expected type is';
const REQUIRED_TYPE: string = 'File is required';

export const DEFAULT_FILE_PROPERTY_NAME = 'file';
export const DEFAULT_FILES_PROPERTY_NAME = 'files';

export const fileValidationPipe = (
  allowedMimeTypes: string[],
  maxSize: number,
  propertyName: string = DEFAULT_FILE_PROPERTY_NAME,
  isRequired: boolean = true,
) => {
  const allowedMimeRegex = new RegExp(allowedMimeTypes.join('|'));

  return new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: allowedMimeRegex,
    })
    .addMaxSizeValidator({
      maxSize: maxSize * 1024 * 1024,
    })
    .build({
      fileIsRequired: isRequired,
      exceptionFactory: (error: string) => {
        const errorsMessages: ErrorFieldExceptionDto[] = [];

        if (error.includes(FILE_TYPE_TYPE)) {
          errorsMessages.push({
            message: `Invalid file type. Allowed only: ${allowedMimeRegex}`,
            field: propertyName,
            errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
          });
        }
        if (error.includes(SIZE_TYPE)) {
          errorsMessages.push({
            message: `The file is too large. Maximum size: ${maxSize} MB`,
            field: propertyName,
            errorKey: EXCEPTION_KEYS_ENUM.EXCEEDED_SIZE,
          });
        }

        if (error.includes(REQUIRED_TYPE)) {
          errorsMessages.push({
            message: error,
            field: propertyName,
            errorKey: EXCEPTION_KEYS_ENUM.FILE_REQUIRED,
          });
        }

        throw new BadRequestException({ errorsMessages: errorsMessages });
      },
    });
};

export const filesValidationPipe = (
  allowedMimeTypes: string[],
  maxSize: number,
  minCount: number,
  maxCount: number,
  propertyName: string = DEFAULT_FILES_PROPERTY_NAME,
) => {
  const allowedMimeRegex = new RegExp(allowedMimeTypes.join('|'));

  return {
    transform: (files: Express.Multer.File[]) => {
      const errorsMessages: ErrorFieldExceptionDto[] = [];

      if (!files || files.length < minCount || files.length > maxCount) {
        errorsMessages.push({
          field: propertyName,
          message: `File are required. Minimum quantity: ${minCount}, Maximum quantity: ${maxCount}`,
          errorKey: EXCEPTION_KEYS_ENUM.INCORRECT_QUANTITY,
        });

        throw new BadRequestException({ errorsMessages });
      }

      const sizeLimit = maxSize * 1024 * 1024;

      for (const [index, file] of files.entries()) {
        try {
          const field = `${propertyName}[${index}]`;

          if (!allowedMimeRegex.test(file.mimetype)) {
            errorsMessages.push({
              field,
              message: `Invalid file type. Allowed only: ${allowedMimeRegex}`,
              errorKey: EXCEPTION_KEYS_ENUM.INVALID_FILE_TYPE,
            });
          }

          if (file.size > sizeLimit) {
            errorsMessages.push({
              field,
              message: `The file is too large. Maximum size: ${maxSize} MB`,
              errorKey: EXCEPTION_KEYS_ENUM.EXCEEDED_SIZE,
            });
          }
        } catch {
          errorsMessages.push({
            field: `${propertyName}[${index}]`,
            message: `Unexpected error during file validation`,
            errorKey: EXCEPTION_KEYS_ENUM.UNKNOWN,
          });
        }
      }

      if (errorsMessages.length > 0) {
        throw new BadRequestException(errorsMessages);
      }

      return files;
    },
  };
};

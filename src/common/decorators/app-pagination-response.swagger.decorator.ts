import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { HttpPrivateExceptionDto } from '@/common/exception-filters/http/http-private-exception.filter';
import { PaginationUtil } from '@/common/utils/pagination.util';

export const ApiAppResponsePaginated = <DataDto extends Type<unknown>>(dataDto: DataDto) =>
  applyDecorators(
    ApiExtraModels(HttpPrivateExceptionDto, PaginationUtil, dataDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(HttpPrivateExceptionDto) },
          {
            type: 'object',
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(PaginationUtil) },
                  {
                    type: 'object',
                    properties: {
                      items: {
                        type: 'array',
                        items: { $ref: getSchemaPath(dataDto) },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }),
  );

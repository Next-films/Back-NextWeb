import { ApiProperty } from '@nestjs/swagger';

export const ADMIN_UPDATE_AVATAR_INPUT_MIME_TYPES = ['image/jpeg', 'image/png'];
export const ADMIN_UPDATE_AVATAR_INPUT_MAX_SIZE = 5; // MB

export class AdminUpdateAvatarInputDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: true,
  })
  file: Express.Multer.File;
}

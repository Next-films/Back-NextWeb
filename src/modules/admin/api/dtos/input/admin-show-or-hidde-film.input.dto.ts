import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { ToBoolean } from '@/common/decorators/transform/boolean.decorator';

export class AdminShowOrHiddeFilmInputDto {
  @ApiProperty()
  @ToBoolean()
  @IsBoolean()
  isHidden: boolean;

  @ApiProperty({
    description:
      'If "false" is specified, nothing will happen to the film, but if "true" a task for moderation will be created.',
  })
  @ToBoolean()
  @IsBoolean()
  isModerate: boolean;
}

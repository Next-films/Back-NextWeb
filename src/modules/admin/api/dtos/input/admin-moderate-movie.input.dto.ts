import { FindTorApiTorrentFilmType, MovieTypesEnum } from '@/common/types/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';

export class ModerateRequestPayloadDto {
  @ApiProperty({ enum: MovieTypesEnum })
  @IsEnum(MovieTypesEnum)
  type: MovieTypesEnum;

  @ApiProperty({
    minLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN,
    maxLength: MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX,
  })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MIN, MOVIES_VALIDATION_RULES.KP_ID.LENGTH_MAX)
  kpId: string;

  @ApiProperty({
    minLength: MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    maxLength: MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(
    MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MIN,
    MOVIES_VALIDATION_RULES.MOVIE_NAME.LENGTH_MAX,
  )
  movieName: string;

  @ApiProperty()
  @IsNotEmpty()
  torrent: FindTorApiTorrentFilmType;
}

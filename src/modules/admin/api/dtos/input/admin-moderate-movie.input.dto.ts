import { FindTorApiTorrentFilmType, MovieTypesEnum, TorApiMovieById } from '@/common/types/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Trim } from '@/common/decorators/transform/trim.decorator';
import { MOVIES_VALIDATION_RULES } from '@/common/constants/validation-rules.constants';
import { Type } from 'class-transformer';

class TorApiFilesDto {
  @ApiProperty() Name: string;
  @ApiProperty() Size: string;
}

class TorApiMovieByIdDto implements TorApiMovieById {
  @ApiProperty() Id: string;
  @ApiProperty() Name: string;
  @ApiProperty() Url: string;
  @ApiProperty() Hash: string;
  @ApiProperty() Magnet: string;
  @ApiProperty() Torrent: string;
  @ApiProperty() Poster: string;

  @ApiProperty({ type: [TorApiFilesDto] })
  @Type(() => TorApiFilesDto)
  Files: TorApiFilesDto[];

  @ApiPropertyOptional() IMDb_link?: string;
  @ApiPropertyOptional() Kinopoisk_link?: string;
  @ApiPropertyOptional() IMDb_id?: string;
  @ApiPropertyOptional() Kinopoisk_id?: string;
  @ApiPropertyOptional() Year?: string;
  @ApiPropertyOptional() Release?: string;
  @ApiPropertyOptional() Type?: string;
  @ApiPropertyOptional() Duration?: string;
  @ApiPropertyOptional() Audio?: string;
  @ApiPropertyOptional() Directer?: string;
  @ApiPropertyOptional() Actors?: string;
  @ApiPropertyOptional() Description?: string;
  @ApiPropertyOptional() Quality?: string;
  @ApiPropertyOptional() Video?: string;

  @ApiPropertyOptional() Original_Name?: string;
  @ApiPropertyOptional() Size?: string;
  @ApiPropertyOptional() Transcript?: string;
  @ApiPropertyOptional() Seeds?: string;
  @ApiPropertyOptional() Peers?: string;
  @ApiPropertyOptional() Download_Count?: string;
  @ApiPropertyOptional() Files_Count?: string;
  @ApiPropertyOptional() Comments?: string;
  @ApiPropertyOptional() IMDb_Rating?: string;
  @ApiPropertyOptional() Kinopoisk_Rating?: string;
  @ApiPropertyOptional() Kinozal_Rating?: string;
  @ApiPropertyOptional() Votes?: string;
  @ApiPropertyOptional() Added_Date?: string;
  @ApiPropertyOptional() Update_Date?: string;
  @ApiPropertyOptional({ type: [String] }) Posters?: string[];

  @ApiPropertyOptional() Rating?: string;
  @ApiPropertyOptional() Category?: string;
  @ApiPropertyOptional() Seed_Date?: string;
  @ApiPropertyOptional() Add_Date?: string;
  @ApiPropertyOptional() Registration?: string;
}

class FindTorApiTorrentFilmDto implements FindTorApiTorrentFilmType {
  @ApiPropertyOptional({ type: [TorApiMovieByIdDto], nullable: true })
  @Type(() => TorApiMovieByIdDto)
  RuTracker?: TorApiMovieByIdDto[] | null;

  @ApiPropertyOptional({ type: [TorApiMovieByIdDto], nullable: true })
  @Type(() => TorApiMovieByIdDto)
  Kinozal?: TorApiMovieByIdDto[] | null;

  @ApiPropertyOptional({ type: [TorApiMovieByIdDto], nullable: true })
  @Type(() => TorApiMovieByIdDto)
  RuTor?: TorApiMovieByIdDto[] | null;

  @ApiPropertyOptional({ type: [TorApiMovieByIdDto], nullable: true })
  @Type(() => TorApiMovieByIdDto)
  NoNameClub?: TorApiMovieByIdDto[] | null;
}

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

  @ApiProperty({ type: FindTorApiTorrentFilmDto })
  @IsNotEmpty()
  torrent: FindTorApiTorrentFilmDto;
}

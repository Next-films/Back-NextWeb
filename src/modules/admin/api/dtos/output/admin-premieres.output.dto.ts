import { ApiProperty } from '@nestjs/swagger';
import { MovieAvailabilityStatus, MovieHandleStatus } from '@/movies/domain/types';
import { AdminPremiereTypeEnum } from '@/admin/api/dtos/input/admin-get-premieres.input-query.dto';

class AdminPremiereGenreOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

class AdminPremiereContentOutputDto {
  @ApiProperty({ nullable: true })
  movieUrl: string | null;

  @ApiProperty({ nullable: true })
  trailerUrl: string | null;

  @ApiProperty({ nullable: true })
  previewUrl: string | null;

  @ApiProperty({ nullable: true })
  backgroundUrl: string | null;

  @ApiProperty({ nullable: true })
  titleUrl: string | null;
}

export class AdminPremiereOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: AdminPremiereTypeEnum })
  type: Exclude<AdminPremiereTypeEnum, AdminPremiereTypeEnum.ALL>;

  @ApiProperty({ nullable: true })
  kpId: string | null;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty({ nullable: true })
  originalTitle: string | null;

  @ApiProperty({ nullable: true })
  alternativeTitles: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  duration: number | null;

  @ApiProperty({ type: AdminPremiereGenreOutputDto, isArray: true })
  genres: AdminPremiereGenreOutputDto[];

  @ApiProperty({ nullable: true })
  universe: string | null;

  @ApiProperty({ nullable: true })
  studio: string | null;

  @ApiProperty({ nullable: true })
  releaseDate: string | null;

  @ApiProperty({ nullable: true })
  country: string[] | null;

  @ApiProperty()
  isHidden: boolean;

  @ApiProperty({ enum: MovieHandleStatus })
  status: MovieHandleStatus;

  @ApiProperty({ enum: MovieAvailabilityStatus })
  availabilityStatus: MovieAvailabilityStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: AdminPremiereContentOutputDto })
  content: AdminPremiereContentOutputDto;
}

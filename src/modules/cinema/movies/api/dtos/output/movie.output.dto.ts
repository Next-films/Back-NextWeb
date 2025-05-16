import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

// TODO:
export class MovieOutputDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  backgroundImg: string; // "https://next-films.ru/films/djoker/trailer.webm"

  @ApiProperty()
  cardImg: string; // "https://next-films.ru/films/djoker/poster.jpg"

  @ApiProperty()
  description: string; // "Находясь на принудительном лечении в больнице Аркхем..."

  @ApiProperty()
  subTitle: string; // "2024 г. ‧ Дрма/Криминал/Триллер ‧ 2 ч 18 мин"

  @ApiProperty()
  title: string; // "Джокер: Безумие на двоих"

  @ApiProperty()
  originalTitle: string; // "Joker: Madness for two"

  @ApiProperty()
  titleImg: string; // "https://next-films.ru/films/djoker/logo.png"

  @ApiProperty()
  type: string; // "films"

  @ApiProperty()
  films: string; // "https://next-films.ru/films/djoker/..."

  @ApiProperty()
  trailer: string; // "https://www.youtube.com/watch?v=j7jPnwVGdZ8"

  @ApiProperty()
  name: string; // "Джокер: Безумие на двоих, Джокер 2, ..."

  @ApiProperty()
  date: string; // "04/09/2024"

  @ApiProperty()
  filter: string[]; // ["Драма", "Криминал", "Триллер"]
}

@Injectable()
export class MovieOutputDtoMapper {
  mapMovie(): any {}

  mapMovies(): any {}
}

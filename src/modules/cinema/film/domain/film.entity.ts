import { Entity, JoinTable, ManyToMany } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Genre } from '@/movies/domain/genre.entity';
import { FilmCreateDto } from '@/films/domain/types';

@Entity()
export class Film extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];

  static create(inputDto: FilmCreateDto): Film {
    return super.createFromDto.call(this, inputDto);
  }
}

import { Entity, JoinTable, ManyToMany } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Genre } from '@/movies/domain/genre.entity';
import { CartonCreateDto } from '@/cartoons/domain/types';

@Entity()
export class Cartoon extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];

  static create(inputDto: CartonCreateDto): Cartoon {
    return super.createFromDto.call(this, inputDto);
  }
}

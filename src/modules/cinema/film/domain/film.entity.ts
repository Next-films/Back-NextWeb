import { Entity, JoinTable, ManyToMany } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Genre } from '@/movies/domain/genre.entity';

@Entity()
export class Film extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];
}

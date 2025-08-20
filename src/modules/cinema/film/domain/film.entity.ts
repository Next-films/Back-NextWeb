import { Entity, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Genre } from '@/movies/domain/genre.entity';
import { FilmCreateDto } from '@/films/domain/types';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';

@Entity()
export class Film extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];

  @OneToOne(
    () => ModerationFilmEntity,
    (moderationFilmEntity: ModerationFilmEntity) => moderationFilmEntity.movie,
  )
  filmModeration: ModerationFilmEntity;

  static create(inputDto: FilmCreateDto): Film {
    return super.createFromDto.call(this, inputDto);
  }
}

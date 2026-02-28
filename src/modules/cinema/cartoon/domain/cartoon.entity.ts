import { Entity, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { Genre } from '@/movies/domain/genre.entity';
import { CartonCreateDto } from '@/cartoons/domain/types';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';

@Entity()
export class Cartoon extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];

  @OneToOne(
    () => ModerationCartoonEntity,
    (moderationCartoonEntity: ModerationCartoonEntity) => moderationCartoonEntity.movie,
  )
  cartoonModeration: ModerationCartoonEntity;

  static create(inputDto: CartonCreateDto): Cartoon {
    return super.createFromDto.call(this, inputDto);
  }
}

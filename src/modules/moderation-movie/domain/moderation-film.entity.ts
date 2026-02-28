import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { Film } from '@/films/domain/film.entity';
import { Admin } from '@/admin/domain/admin.entity';

@Entity()
export class ModerationFilmEntity extends ModerationMovieEntity {
  @OneToOne(() => Film, (film: Film) => film.filmModeration, { onDelete: 'CASCADE' })
  @JoinColumn()
  movie: Film;

  @ManyToOne(() => Admin, (admin: Admin) => admin.moderationFilms)
  @JoinColumn()
  admin: Admin;

  @Column({ nullable: true })
  adminId: number;
}

import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Film } from '@/films/domain/film.entity';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';

@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, collation: RU_PG_COLLATION })
  name: string;

  @ManyToMany(() => Film, film => film.genres)
  films: Film[];

  static create(name: string): Genre {
    const genre = new this();
    genre.name = name;

    return genre;
  }
}

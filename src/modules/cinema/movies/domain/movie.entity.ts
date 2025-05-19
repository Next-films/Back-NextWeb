import { Column, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';

export class MovieEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  videoUrl: string;

  @Column()
  trailerUrl: string;

  @Column()
  title: string;

  @Column()
  originalTitle: string;

  @Column()
  subTitle: string;

  @Column()
  description: string;

  @Column()
  backgroundImg: string;

  @Column()
  cardImg: string;

  @Column()
  titleImg: string;

  @Column()
  duration: number;

  @Column('character varying', { array: true })
  country: string[];

  @Column({ nullable: true })
  alternativeTitles: string;

  @Column({ type: 'date' })
  releaseDate: Date;

  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];
}

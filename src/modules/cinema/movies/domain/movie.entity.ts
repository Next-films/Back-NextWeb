import { Column, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';
import { GenreEntity } from 'modules/genres/domain/genre.entity';

export class MovieEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  videoUrl: string;

  @Column()
  trailerUrl: string;

  @Column({ collation: RU_PG_COLLATION })
  title: string;

  @Column()
  originalTitle: string;

  @Column({ collation: RU_PG_COLLATION })
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

  @ManyToMany(() => GenreEntity, (genre) => genre.movies, { cascade: true })
  @JoinTable()
  genres: GenreEntity[];
}

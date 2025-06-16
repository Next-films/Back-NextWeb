import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';
import { CartonCreateDto } from '@/cartoons/domain/types';
import { FilmCreateDto } from '@/films/domain/types';

export class MovieEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kpId: string;

  @Column()
  videoUrl: string;

  @Column({ collation: RU_PG_COLLATION })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  originalTitle: string | null;

  @Column({ type: 'varchar', collation: RU_PG_COLLATION, nullable: true })
  description: string | null;

  @Column({ default: false })
  isHidden: boolean;

  @Column('character varying', { array: true, nullable: true })
  country: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  alternativeTitles: string | null;

  @Column({ type: 'date', nullable: true })
  releaseDate: string | null;

  @Column({ type: 'double precision', default: 0 })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  trailerUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  backgroundImg: string | null;

  @Column({ type: 'varchar', nullable: true })
  cardImg: string | null;

  @Column({ type: 'varchar', nullable: true })
  titleImg: string | null;

  genres: Genre[];

  // TODO:
  static createFromDto<T extends MovieEntity>(
    this: new () => T,
    inputDto: CartonCreateDto | FilmCreateDto,
  ): T {
    const {
      kpId,
      key,
      hidden,
      description,
      genres,
      originalName,
      alternativeName,
      name,
      country,
      duration,
      releaseDate,
    } = inputDto;

    const instance = new this();

    instance.kpId = kpId;
    instance.videoUrl = key;
    instance.isHidden = hidden;
    instance.title = name;
    instance.originalTitle = originalName;
    instance.description = description;
    instance.duration = duration;
    instance.country = country;
    instance.alternativeTitles = alternativeName;
    instance.releaseDate = releaseDate;

    instance.trailerUrl = '';
    instance.backgroundImg = '';
    instance.cardImg = '';
    instance.titleImg = '';

    if (genres && genres.length > 0) {
      instance.genres = genres;
    }

    return instance;
  }
}

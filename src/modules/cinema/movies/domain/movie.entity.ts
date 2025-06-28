import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { CartonCreateDto } from '@/cartoons/domain/types';
import { FilmCreateDto } from '@/films/domain/types';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';
import { MovieHandleStatus } from '@/movies/domain/types';

export class MovieEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kpId: string;

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null;

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
  backgroundContentUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  previewUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  titleUrl: string | null; // Movie name in the picture png

  @Column({ enum: MovieHandleStatus, default: MovieHandleStatus.PROCESSING })
  handleStatus: MovieHandleStatus;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  genres: Genre[];

  // TODO:
  static createFromDto<T extends MovieEntity>(
    this: new () => T,
    inputDto: CartonCreateDto | FilmCreateDto,
  ): T {
    const currentDate = new Date();
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
      handleStatus,
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
    instance.createdAt = currentDate;
    instance.updatedAt = currentDate;
    instance.handleStatus = handleStatus;

    instance.trailerUrl = '';
    instance.backgroundContentUrl = '';
    instance.previewUrl = '';
    instance.titleUrl = '';

    if (genres && genres.length > 0) {
      instance.genres = genres;
    }

    return instance;
  }

  // TODO:
  update(inputDto: CartonCreateDto | FilmCreateDto): void {
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

    this.kpId = kpId;
    this.videoUrl = key;
    this.isHidden = hidden;
    this.title = name;
    this.originalTitle = originalName;
    this.description = description;
    this.duration = duration;
    this.country = country;
    this.alternativeTitles = alternativeName;
    this.releaseDate = releaseDate;
    this.updatedAt = new Date();

    this.trailerUrl = '';
    this.backgroundContentUrl = '';
    this.previewUrl = '';
    this.titleUrl = '';

    if (genres && genres.length > 0) {
      this.genres = genres;
    }
  }

  updateHandleStatus(status: MovieHandleStatus): void {
    this.handleStatus = status;
  }

  showOrHiddeMovie(isHidden: boolean, status?: MovieHandleStatus): void {
    this.isHidden = isHidden;
    this.updatedAt = new Date();
    if (status) {
      if (status !== MovieHandleStatus.PRODUCTION) {
        this.isHidden = true;
      }
      this.handleStatus = status;
    }
  }
}

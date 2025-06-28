import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { FindTorApiTorrentFilmType } from '@/common/types/types';
import { CreateModerationDto } from '@/moderation-movie/domain/types';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { Film } from '@/films/domain/film.entity';

export class ModerationMovieEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  acceptAt: Date;

  @Column({ unique: true, nullable: false })
  movieId: number;

  @Column({ type: 'jsonb', nullable: true })
  torrentData: FindTorApiTorrentFilmType | null;

  admin: Admin;

  movie: Film | Cartoon;

  static create<T>(dto: CreateModerationDto): T {
    const { movieId, admin, torrentMetaData } = dto;

    const instance = new this();
    const currentDate = new Date();

    instance.movieId = movieId;
    instance.createdAt = currentDate;

    if (admin) {
      instance.admin = admin;
      instance.acceptAt = currentDate;
    }

    if (torrentMetaData) {
      instance.torrentData = torrentMetaData;
    }

    return instance as T;
  }

  attachAdmin(admin: Admin): void {
    this.admin = admin;
    this.acceptAt = new Date();
  }
}

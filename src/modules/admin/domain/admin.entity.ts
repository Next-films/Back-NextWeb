import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToOne(() => AdminTelegram, (telegram: AdminTelegram) => telegram.admin)
  adminTelegram: AdminTelegram;

  @OneToMany(() => AdminSession, (adminSession: AdminSession) => adminSession.admin)
  sessions: AdminSession[];

  @OneToMany(
    () => ModerationFilmEntity,
    (moderationFilmEntity: ModerationFilmEntity) => moderationFilmEntity.admin,
  )
  moderationFilms: ModerationFilmEntity[];

  @OneToMany(
    () => ModerationCartoonEntity,
    (moderationCartoonEntity: ModerationCartoonEntity) => moderationCartoonEntity.admin,
  )
  moderationCartoons: ModerationCartoonEntity[];

  @OneToMany(
    () => FinishedTorrentModerationEntity,
    (finishedTorrentModerationEntity: FinishedTorrentModerationEntity) =>
      finishedTorrentModerationEntity.admin,
  )
  finishedTorrentModeration: FinishedTorrentModerationEntity[];

  // TODO: создание телеграм сущности при регистрации нового админа
  static create(email: string, username: string, password: string): Admin {
    const admin = new this();
    admin.email = email;
    admin.username = username;
    admin.password = password;
    admin.createdAt = new Date();

    return admin;
  }

  updateTelegramInfo(username: string): void {
    this.adminTelegram.username = username;
  }
}

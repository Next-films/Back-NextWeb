import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminSession } from '@/admin-auth/domain/admin-session.entity';
import { ModerationFilmEntity } from '@/moderation-movie/domain/moderation-film.entity';
import { ModerationCartoonEntity } from '@/moderation-movie/domain/moderation-cartoon.entity';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';
import { FinishedTorrentModerationEntity } from '@/moderation-movie/domain/finished-torrent-moderation.entity';
import { AdminRole } from '@/admin/domain/admin-role.entity';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ default: false })
  isOwner: boolean;

  @Column({ type: 'varchar', nullable: true })
  telegramAuthToken: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  telegramAuthTokenExpAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  passwordSetupDeadlineAt: Date | null;

  @Column({ nullable: true })
  avatarUrl: string;

  // TODO: Проверки если админ не активен, он ничего не может делать
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // TODO: Провекрка в некоторых операциях может ли админ это делать. Регистрация нового админа, управлением другими админами.
  @ManyToMany(() => AdminRole, (role: AdminRole) => role.admins, { cascade: true })
  @JoinTable()
  roles: AdminRole[];

  @OneToOne(() => AdminTelegram, (telegram: AdminTelegram) => telegram.admin, { cascade: true })
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
    () => ModerationSerialEntity,
    (moderationSerialEntity: ModerationSerialEntity) => moderationSerialEntity.admin,
  )
  moderationSerials: ModerationSerialEntity[];

  @OneToMany(
    () => FinishedTorrentModerationEntity,
    (finishedTorrentModerationEntity: FinishedTorrentModerationEntity) =>
      finishedTorrentModerationEntity.admin,
  )
  finishedTorrentModeration: FinishedTorrentModerationEntity[];

  static create(
    email: string,
    username: string,
    password: string | null,
    tgId: string,
    tgUsername: string | null,
    roles: AdminRole[],
    passwordSetupDeadlineAt: Date | null = null,
    isOwner = false,
  ): Admin {
    const admin = new this();
    const date = new Date();
    admin.email = email;
    admin.username = username;
    admin.password = password;
    admin.createdAt = date;

    const adminTg = new AdminTelegram();

    admin.adminTelegram = adminTg;
    adminTg.createdAt = date;
    adminTg.telegramId = tgId;
    adminTg.username = tgUsername;
    admin.roles = roles;
    admin.passwordSetupDeadlineAt = passwordSetupDeadlineAt;
    admin.isOwner = isOwner;
    admin.telegramAuthToken = null;
    admin.telegramAuthTokenExpAt = null;

    return admin;
  }

  updateTelegramInfo(username: string): void {
    this.adminTelegram.username = username;
  }

  setTelegramIdentity(telegramId: string, username?: string): void {
    this.adminTelegram.telegramId = telegramId;
    if (username) this.adminTelegram.username = username;
  }

  issueTelegramAuthToken(token: string, expAt: Date): void {
    this.telegramAuthToken = token;
    this.telegramAuthTokenExpAt = expAt;
  }

  clearTelegramAuthToken(): void {
    this.telegramAuthToken = null;
    this.telegramAuthTokenExpAt = null;
  }

  updatePassword(hashPassword: string): void {
    this.password = hashPassword;
    this.passwordSetupDeadlineAt = null;
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }

  updateRoles(roles: AdminRole[]): void {
    this.roles = roles;
  }

  updateAdmin(username: string, email: string, tgId: string): void {
    this.username = username;
    this.email = email;
    this.adminTelegram.telegramId = tgId;
    this.adminTelegram.username = null;
  }

  updateAvatar(url: string): void {
    this.avatarUrl = url;
  }
}

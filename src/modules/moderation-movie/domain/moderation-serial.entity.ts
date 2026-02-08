import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';
import { Serial } from '@/serials/domain/serial.entity';
import { Admin } from '@/admin/domain/admin.entity';

@Entity()
export class ModerationSerialEntity extends ModerationMovieEntity {
  @OneToOne(() => Serial, (serial: Serial) => serial.serialModeration, { onDelete: 'CASCADE' })
  @JoinColumn()
  movie: Serial;

  @ManyToOne(() => Admin, (admin: Admin) => admin.moderationSerials)
  @JoinColumn()
  admin: Admin;

  @Column({ nullable: true })
  adminId: number;
}

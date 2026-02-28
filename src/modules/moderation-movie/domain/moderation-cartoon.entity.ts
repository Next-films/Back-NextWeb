import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';
import { ModerationMovieEntity } from '@/moderation-movie/domain/moderation-movie.entity';

@Entity()
export class ModerationCartoonEntity extends ModerationMovieEntity {
  @OneToOne(() => Cartoon, (cartoon: Cartoon) => cartoon.cartoonModeration, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  movie: Cartoon;

  @ManyToOne(() => Admin, (admin: Admin) => admin.moderationCartoons)
  @JoinColumn()
  admin: Admin;

  @Column({ nullable: true })
  adminId: number;
}

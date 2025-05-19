import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';
import { Serial } from '@/serials/domain/serial.entity';

@Entity()
export class SerialEpisode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ collation: RU_PG_COLLATION, nullable: true })
  title: string;

  @Column({ nullable: true })
  originalTitle: string;

  @Column({ collation: RU_PG_COLLATION, nullable: true })
  description: string;

  @Column()
  previewUrl: string;

  @Column({ type: 'date' })
  releaseDate: Date;

  @Column()
  videoUrl: string;

  @Column()
  duration: number;

  @ManyToOne(() => Serial, serial => serial.episodes)
  @JoinColumn()
  serial: Serial;

  @Column()
  serialId: number;
}

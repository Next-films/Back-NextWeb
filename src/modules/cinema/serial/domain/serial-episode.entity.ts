import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RU_PG_COLLATION } from '@/common/constants/collation.constant';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

@Entity()
export class SerialEpisode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ collation: RU_PG_COLLATION, nullable: true })
  title: string;

  @Column({ nullable: true })
  originalTitle: string;

  @Column({ type: 'varchar', collation: RU_PG_COLLATION, nullable: true })
  description: string | null;

  @Column()
  previewUrl: string;

  @Column({ type: 'date' })
  releaseDate: Date;

  @Column()
  videoUrl: string;

  @Column()
  duration: number;

  @Column({ type: 'int', nullable: true })
  episodeNumber: number | null;

  @Column({ type: 'varchar', collation: RU_PG_COLLATION, nullable: true })
  voiceoverLabel: string | null;

  @ManyToOne(() => Serial, serial => serial.episodes)
  @JoinColumn()
  serial: Serial;

  @Column()
  serialId: number;

  @ManyToOne(() => SerialSeason, season => season.episodes)
  @JoinColumn()
  season: SerialSeason;

  @Column({ type: 'int', nullable: true })
  seasonId: number | null;
}

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';

@Entity()
export class SerialSeason {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  seasonNumber: number;

  @ManyToOne(() => Serial, serial => serial.seasons)
  @JoinColumn()
  serial: Serial;

  @Column()
  serialId: number;

  @OneToMany(() => SerialEpisode, episode => episode.season, { cascade: true })
  episodes: SerialEpisode[];
}

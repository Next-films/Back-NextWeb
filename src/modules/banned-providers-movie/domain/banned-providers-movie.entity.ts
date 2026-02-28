import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TorApiProvidersEnum } from '@/common/types/types';

@Entity()
export class BannedProvidersMovie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ enum: TorApiProvidersEnum })
  provider: TorApiProvidersEnum;

  @Column()
  providerId: string;

  @Column({ type: 'varchar', nullable: true })
  movieName: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  static create(
    provider: TorApiProvidersEnum,
    providerId: string,
    movieName: string | null,
  ): BannedProvidersMovie {
    const inst = new this();

    inst.provider = provider;
    inst.providerId = providerId;
    inst.movieName = movieName;
    inst.createdAt = new Date();

    return inst;
  }

  update(movieName: string): void {
    this.movieName = movieName;
  }
}

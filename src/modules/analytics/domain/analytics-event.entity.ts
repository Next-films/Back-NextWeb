import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AnalyticsEventType {
  VISIT = 'visit',
  VIEW = 'view',
}

export enum AnalyticsContentType {
  FILM = 'film',
  SERIAL = 'serial',
  CARTOON = 'cartoon',
}

@Entity('analytics_event')
export class AnalyticsEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AnalyticsEventType })
  type: AnalyticsEventType;

  @Column({ type: 'enum', enum: AnalyticsContentType, nullable: true })
  contentType: AnalyticsContentType | null;

  @Column({ type: 'int', nullable: true })
  contentId: number | null;

  @Column({ type: 'varchar', nullable: true })
  visitorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}

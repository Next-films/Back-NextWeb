import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceId: string;

  @Column()
  issueAt: Date;

  @Column()
  expiredAt: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import * as path from 'path';
import { URL } from 'url';

@Entity()
export class ConverterLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  movieKpId: string;

  @Column()
  url: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  static create(movieKpId: string, url: string): ConverterLogs {
    const log = new this();

    const parsedUrl = new URL(url);
    const logName = path.basename(parsedUrl.pathname);

    log.movieKpId = movieKpId;
    log.url = url;
    log.name = logName;
    log.createdAt = new Date();

    return log;
  }
}

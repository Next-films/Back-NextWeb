import { Entity, JoinTable, ManyToMany, OneToMany, OneToOne } from 'typeorm';
import { Genre } from '@/movies/domain/genre.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { SerialCreateDto } from '@/serials/domain/types';
import { ModerationSerialEntity } from '@/moderation-movie/domain/moderation-serial.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

@Entity()
export class Serial extends MovieEntity {
  @ManyToMany(() => Genre, genre => genre.films, { cascade: true })
  @JoinTable()
  genres: Genre[];

  @OneToMany(() => SerialEpisode, episode => episode.serial, { cascade: true })
  episodes: SerialEpisode[];

  @OneToMany(() => SerialSeason, season => season.serial, { cascade: true })
  seasons: SerialSeason[];

  @OneToOne(
    () => ModerationSerialEntity,
    (moderationSerialEntity: ModerationSerialEntity) => moderationSerialEntity.movie,
  )
  serialModeration: ModerationSerialEntity;

  static create(inputDto: SerialCreateDto): Serial {
    return super.createFromDto.call(this, inputDto);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Serial } from '@/serials/domain/serial.entity';
import { SerialEpisode } from '@/serials/domain/serial-episode.entity';
import { SerialSeason } from '@/serials/domain/serial-season.entity';

@Injectable()
export class SerialRepository {
  constructor(@InjectRepository(Serial) private readonly serialRepository: Repository<Serial>) {}

  async save(serial: Serial, queryRunner?: QueryRunner): Promise<Serial> {
    if (queryRunner) {
      return queryRunner.manager.save(serial);
    }
    return this.serialRepository.save(serial);
  }

  async remove(serial: Serial): Promise<void> {
    await this.serialRepository.remove(serial);
  }

  async getSerialByKinopoiskId(kpId: string, queryRunner?: QueryRunner): Promise<Serial | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.serialRepository.target, {
        where: { kpId },
        relations: { genres: true, episodes: { season: true }, seasons: { episodes: true } },
      });
    }
    return this.serialRepository.findOne({
      where: { kpId },
      relations: { genres: true, episodes: { season: true }, seasons: { episodes: true } },
    });
  }

  async getSerialById(id: number, queryRunner?: QueryRunner): Promise<Serial | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.serialRepository.target, {
        where: { id },
        relations: { genres: true, episodes: { season: true }, seasons: { episodes: true } },
      });
    }
    return this.serialRepository.findOne({
      where: { id },
      relations: { genres: true, episodes: { season: true }, seasons: { episodes: true } },
    });
  }

  async getSerialEpisodeById(serialId: number, episodeId: number): Promise<SerialEpisode | null> {
    return this.serialRepository.manager.getRepository(SerialEpisode).findOne({
      where: { id: episodeId, serialId },
      relations: { season: true },
    });
  }

  async removeSerialEpisode(episode: SerialEpisode): Promise<void> {
    await this.serialRepository.manager.getRepository(SerialEpisode).remove(episode);
  }

  async removeSeasonIfEmpty(serialId: number, seasonId: number | null): Promise<void> {
    if (!seasonId) return;

    const episodeRepository = this.serialRepository.manager.getRepository(SerialEpisode);
    const seasonRepository = this.serialRepository.manager.getRepository(SerialSeason);
    const seasonEpisodesCount = await episodeRepository.count({ where: { serialId, seasonId } });

    if (seasonEpisodesCount === 0) {
      await seasonRepository.delete({ id: seasonId, serialId });
    }
  }
}

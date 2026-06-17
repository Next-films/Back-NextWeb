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
    // Delete children explicitly in FK order (episodes → seasons → serial). Relying on
    // TypeORM cascade here left serial_season rows behind and the serial delete failed on
    // the foreign key constraint.
    await this.serialRepository.manager.transaction(async manager => {
      await manager.getRepository(SerialEpisode).delete({ serialId: serial.id });
      await manager.getRepository(SerialSeason).delete({ serialId: serial.id });
      // Children already gone; drop the loaded relations so remove() only clears the
      // genres junction and the serial row itself.
      serial.episodes = [];
      serial.seasons = [];
      await manager.getRepository(Serial).remove(serial);
    });
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

  async removeDuplicateEpisodesBySerialId(
    serialId: number,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner?.manager ?? this.serialRepository.manager;
    const episodeRepository = manager.getRepository(SerialEpisode);
    const seasonRepository = manager.getRepository(SerialSeason);

    const episodes = await episodeRepository.find({
      where: { serialId },
      relations: { season: true },
      order: { id: 'DESC' },
    });

    if (episodes.length <= 1) return 0;

    const seenSlots = new Set<string>();
    const duplicateIds: number[] = [];
    const affectedSeasonIds = new Set<number>();

    for (const episode of episodes) {
      const seasonNumber = episode.season?.seasonNumber ?? 1;
      const episodeNumber = episode.episodeNumber ?? this.extractEpisodeNumber(episode.title);
      const voiceoverKey = (episode.voiceoverLabel || '').trim().toLowerCase() || 'default';
      const titleKey = (episode.title || '').trim().toLowerCase();
      const slotKey = episodeNumber
        ? `${seasonNumber}:${episodeNumber}:${voiceoverKey}`
        : `${seasonNumber}:title:${titleKey}:${voiceoverKey}`;

      if (!seenSlots.has(slotKey)) {
        seenSlots.add(slotKey);
        continue;
      }

      duplicateIds.push(episode.id);
      if (episode.seasonId) affectedSeasonIds.add(episode.seasonId);
    }

    if (duplicateIds.length === 0) return 0;

    await episodeRepository.delete(duplicateIds);

    for (const seasonId of affectedSeasonIds) {
      const leftCount = await episodeRepository.count({ where: { serialId, seasonId } });

      if (leftCount === 0) {
        await seasonRepository.delete({ id: seasonId, serialId });
      }
    }

    return duplicateIds.length;
  }

  private extractEpisodeNumber(title: string | null | undefined): number | null {
    if (!title) return null;
    const match = title.match(/(\d{1,4})/);

    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);

    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return parsed;
  }
}

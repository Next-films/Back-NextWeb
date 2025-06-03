import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EpisodeEntity } from './domain/episode.entity';
import { Repository } from 'typeorm';
import { UpdateEpisodeDto } from './api/dtos/update-episode.dto';

@Injectable()
export class EpisodesService {
    constructor(
        @InjectRepository(EpisodeEntity)
        private readonly episodeRepo: Repository<EpisodeEntity>,
    ) {}

    async update(id: number, dto: UpdateEpisodeDto): Promise<EpisodeEntity> {
        const episode = await this.episodeRepo.findOneBy({ id });
        if (!episode) throw new NotFoundException('Episode not found');

        Object.assign(episode, dto);
        return this.episodeRepo.save(episode);
    }

    async delete(id: number): Promise<void> {
        const result = await this.episodeRepo.delete(id);
        if (!result.affected) throw new NotFoundException('Episode not found');
    }
}

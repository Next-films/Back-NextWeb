import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannedProvidersMovie } from '@/banned-providers-movie/domain/banned-providers-movie.entity';
import { TorApiProvidersEnum } from '@/common/types/types';

@Injectable()
export class BannedProvidersMovieRepository {
  constructor(
    @InjectRepository(BannedProvidersMovie)
    private readonly bannedProvidersMovieRepository: Repository<BannedProvidersMovie>,
  ) {}

  async save(inst: BannedProvidersMovie): Promise<void> {
    await this.bannedProvidersMovieRepository.save(inst);
  }

  async remove(id: number): Promise<void> {
    await this.bannedProvidersMovieRepository.delete(id);
  }

  async getBannedProviderMovieById(id: number): Promise<BannedProvidersMovie | null> {
    return this.bannedProvidersMovieRepository.findOne({
      where: {
        id,
      },
    });
  }

  async getBannedProviderMovie(
    provider: TorApiProvidersEnum,
    providerId: string,
  ): Promise<BannedProvidersMovie | null> {
    return this.bannedProvidersMovieRepository.findOne({
      where: {
        provider,
        providerId,
      },
    });
  }
}

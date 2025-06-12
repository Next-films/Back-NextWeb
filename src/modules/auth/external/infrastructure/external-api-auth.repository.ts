import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ExternalApiAuthRepository {
  constructor(
    @InjectRepository(ExternalApiAuth)
    private readonly externalApiAuthRepository: Repository<ExternalApiAuth>,
  ) {}

  async save(token: ExternalApiAuth): Promise<void> {
    await this.externalApiAuthRepository.save(token);
  }

  async removeById(tokenId: number): Promise<void> {
    await this.externalApiAuthRepository.delete({ id: tokenId });
  }

  async getTokenById(id: number): Promise<ExternalApiAuth | null> {
    return this.externalApiAuthRepository.findOne({
      where: { id },
    });
  }

  async getTokenByName(name: string): Promise<ExternalApiAuth | null> {
    return this.externalApiAuthRepository.findOne({
      where: { name },
    });
  }
}

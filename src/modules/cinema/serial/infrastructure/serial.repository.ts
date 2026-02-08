import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Serial } from '@/serials/domain/serial.entity';

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
}

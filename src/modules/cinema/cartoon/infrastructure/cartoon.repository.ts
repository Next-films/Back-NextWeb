import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';

@Injectable()
export class CartoonRepository {
  constructor(@InjectRepository(Cartoon) private readonly cartoonRepository: Repository<Cartoon>) {}

  async save(cartoon: Cartoon, queryRunner?: QueryRunner): Promise<void> {
    if (queryRunner) {
      await queryRunner.manager.save(cartoon);
      return;
    }
    await this.cartoonRepository.save(cartoon);
  }

  async getCartoonByKinopoiskId(kpId: string, queryRunner?: QueryRunner): Promise<Cartoon | null> {
    if (queryRunner) {
      return queryRunner.manager.findOne(this.cartoonRepository.target, { where: { kpId } });
    }
    return this.cartoonRepository.findOne({ where: { kpId } });
  }
}

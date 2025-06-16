import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cartoon } from '@/cartoons/domain/cartoon.entity';

@Injectable()
export class CartoonRepository {
  constructor(@InjectRepository(Cartoon) private readonly cartoonRepository: Repository<Cartoon>) {}

  async save(cartoon: Cartoon): Promise<void> {
    await this.cartoonRepository.save(cartoon);
  }

  async getCartoonByKinopoiskId(kpId: string): Promise<Cartoon | null> {
    return this.cartoonRepository.findOne({ where: { kpId } });
  }
}

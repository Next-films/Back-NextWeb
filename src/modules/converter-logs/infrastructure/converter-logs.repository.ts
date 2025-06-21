import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ConverterLogs } from '@/converter-logs/domain/converter-logs.entity';

@Injectable()
export class ConverterLogsRepository {
  constructor(
    @InjectRepository(ConverterLogs)
    private readonly converterLogsRepository: Repository<ConverterLogs>,
  ) {}

  async save(log: ConverterLogs): Promise<void> {
    await this.converterLogsRepository.save(log);
  }

  async saveMany(logs: ConverterLogs[]): Promise<void> {
    await this.converterLogsRepository.save(logs);
  }

  async remove(logs: ConverterLogs[]): Promise<void> {
    await this.converterLogsRepository.remove(logs);
  }

  async getExpiredLogs(date: Date, take: number): Promise<ConverterLogs[] | null> {
    const result = await this.converterLogsRepository.find({
      where: {
        createdAt: LessThan(date),
      },
      take,
    });
    return result && result.length > 0 ? result : null;
  }

  async getLogs(skip: number, take: number): Promise<ConverterLogs[] | null> {
    const result = await this.converterLogsRepository.find({ skip, take });

    return result && result.length > 0 ? result : null;
  }
}

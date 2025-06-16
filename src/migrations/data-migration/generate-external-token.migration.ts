import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ConfigurationType } from '@/settings/configuration';
import { ExternalApiAuth } from '@/external-auth/domain/external-api-auth.entity';
import { ExternalApiTokenExpAtEnum } from '@/external-auth/domain/types';

@Injectable()
export class GenerateExternalTokenMigration implements OnModuleInit {
  private readonly external_token_name: string;
  private readonly external_token: string;
  constructor(
    @InjectRepository(ExternalApiAuth)
    private readonly externalApiRepository: Repository<ExternalApiAuth>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<ConfigurationType, true>,
  ) {
    this.logger.setContext(GenerateExternalTokenMigration.name);
    const apiSettings = this.configService.get('apiSettings', { infer: true });
    this.external_token = apiSettings.EXTERNAL_TOKEN;
    this.external_token_name = apiSettings.EXTERNAL_TOKEN_NAME;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Generate external token migration: Migration is running');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await this.generate(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Generate external token migration: Migration is completed');
    } catch (e) {
      this.logger.error(e, this.onModuleInit.name);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async generate(queryRunner: QueryRunner): Promise<void> {
    const token = await queryRunner.manager.findOne(this.externalApiRepository.target, {
      where: { name: this.external_token_name },
    });

    if (token) {
      this.logger.warn(`Token already exists, token name: ${token.name}`);
      return;
    }

    const currentDate = new Date();
    await queryRunner.manager.save(this.externalApiRepository.target, {
      name: this.external_token_name,
      token: this.external_token,
      createdAt: currentDate,
      updatedAt: currentDate,
      exp: ExternalApiTokenExpAtEnum.F,
    });
  }
}

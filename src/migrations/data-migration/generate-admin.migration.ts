import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { ConfigService } from '@nestjs/config';
import { ApiSettingsType, ConfigurationType } from '@/settings/configuration';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';

@Injectable()
export class GenerateAdminMigration implements OnModuleInit {
  private readonly admin_salt_round: number;
  private readonly apiSettings: ApiSettingsType;
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminTelegram)
    private readonly adminTgRepository: Repository<AdminTelegram>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<ConfigurationType, true>,
    private readonly bcryptService: BcryptService,
  ) {
    this.logger.setContext(GenerateAdminMigration.name);
    const businessRules = this.configService.get('businessRulesSettings', { infer: true });
    this.apiSettings = this.configService.get('apiSettings', { infer: true });
    this.admin_salt_round = businessRules.ADMIN_HASH_SALT_ROUND;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Generate admin migration: Migration is running');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await this.generate(queryRunner);

      await queryRunner.commitTransaction();
      this.logger.log('Generate admin migration: Migration is completed');
    } catch (e) {
      this.logger.error(e, this.onModuleInit.name);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async generate(queryRunner: QueryRunner): Promise<void> {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL, ADMIN_TG_USERNAME, ADMIN_TG_ID } =
      this.apiSettings;

    const admin = await queryRunner.manager.findOne(this.adminRepository.target, {
      where: [
        {
          email: ADMIN_EMAIL,
        },
        {
          username: ADMIN_USERNAME,
        },
      ],
    });

    if (admin) {
      this.logger.warn(`Admin already exists, email: ${ADMIN_EMAIL}, username: ${ADMIN_USERNAME}`);
      return;
    }

    const hash = await this.bcryptService.generateHash(ADMIN_PASSWORD, this.admin_salt_round);

    const result = await queryRunner.manager.save(this.adminRepository.target, {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: hash,
      createdAt: new Date(),
    });

    await queryRunner.manager.save(this.adminTgRepository.target, {
      adminId: result.id,
      telegramId: ADMIN_TG_ID,
      username: ADMIN_TG_USERNAME,
      createdAt: new Date(),
    });
  }
}

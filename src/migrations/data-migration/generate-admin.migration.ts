import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { ConfigService } from '@nestjs/config';
import { ApiSettingsType, ConfigurationType } from '@/settings/configuration';
import { BcryptService } from '@/bcrypt-module/application/bcrypt.service';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';
import { AdminRole } from '@/admin/domain/admin-role.entity';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

@Injectable()
export class GenerateAdminMigration implements OnModuleInit {
  private readonly admin_salt_round: number;
  private readonly apiSettings: ApiSettingsType;
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminTelegram)
    private readonly adminTgRepository: Repository<AdminTelegram>,
    @InjectRepository(AdminRole)
    private readonly adminRoleRepository: Repository<AdminRole>,
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

      await this.generateRole(queryRunner);
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

  private async generateRole(queryRunner: QueryRunner): Promise<void> {
    const ROLE_NAME = Object.values(AdminRoleEnum);

    const roles = await queryRunner.manager.find(this.adminRoleRepository.target);
    const existingRoles: string[] = [];
    const dtos: AdminRole[] = [];
    for (const role of ROLE_NAME) {
      const roleExist = roles.find(r => r.name === role);

      if (roleExist) {
        existingRoles.push(role);
        continue;
      }

      const newRole = queryRunner.manager.create(this.adminRoleRepository.target, {
        name: role,
      });

      dtos.push(newRole);
    }

    if (dtos.length > 0) {
      await queryRunner.manager.save(dtos);
    }

    if (existingRoles.length > 0) {
      this.logger.warn(
        `Role already exists: ${JSON.stringify(existingRoles)}`,
        this.generateRole.name,
      );
    }
  }

  private async generate(queryRunner: QueryRunner): Promise<void> {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL, ADMIN_TG_USERNAME, ADMIN_TG_ID } =
      this.apiSettings;

    const allRoles = await queryRunner.manager.find(this.adminRoleRepository.target);
    if (!allRoles || allRoles.length === 0) {
      this.logger.error('Roles were not found, the administrator could not be created');
      throw new Error('Roles were not found, the administrator could not be created');
    }

    const admin = await queryRunner.manager.findOne(this.adminRepository.target, {
      where: [
        {
          email: ADMIN_EMAIL,
        },
        {
          username: ADMIN_USERNAME,
        },
      ],
      relations: {
        roles: true,
      },
    });

    if (admin) {
      const existingRoles = admin.roles || [];
      const roleIds = new Set(existingRoles.map(r => r.id));
      const hasAllRoles = allRoles.every(role => roleIds.has(role.id));

      if (!hasAllRoles) {
        admin.roles = allRoles;
        await queryRunner.manager.save(this.adminRepository.target, admin);
        this.logger.warn(
          `Default admin roles were updated to full access, email: ${ADMIN_EMAIL}, username: ${ADMIN_USERNAME}`,
        );
      } else {
        this.logger.warn(
          `Admin already exists, email: ${ADMIN_EMAIL}, username: ${ADMIN_USERNAME}`,
        );
      }
      return;
    }

    const hash = await this.bcryptService.generateHash(ADMIN_PASSWORD, this.admin_salt_round);

    const result = await queryRunner.manager.save(this.adminRepository.target, {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: hash,
      createdAt: new Date(),
      roles: allRoles,
    });

    await queryRunner.manager.save(this.adminTgRepository.target, {
      adminId: result.id,
      telegramId: ADMIN_TG_ID,
      username: ADMIN_TG_USERNAME,
      createdAt: new Date(),
    });
  }
}

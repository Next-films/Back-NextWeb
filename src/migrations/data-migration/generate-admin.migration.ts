import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Admin } from '@/admin/domain/admin.entity';
import { ConfigService } from '@nestjs/config';
import { ApiSettingsType, ConfigurationType } from '@/settings/configuration';
import { AdminTelegram } from '@/admin/domain/admin-telegram.entity';
import { AdminRole } from '@/admin/domain/admin-role.entity';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';

@Injectable()
export class GenerateAdminMigration implements OnModuleInit {
  private static readonly OWNER_TG_ID = '1499096990';
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
  ) {
    this.logger.setContext(GenerateAdminMigration.name);
    this.apiSettings = this.configService.get('apiSettings', { infer: true });
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
    const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_TG_USERNAME } = this.apiSettings;

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
        {
          adminTelegram: { telegramId: GenerateAdminMigration.OWNER_TG_ID },
        },
      ],
      relations: {
        roles: true,
        adminTelegram: true,
      },
    });

    if (admin) {
      const existingRoles = admin.roles || [];
      const roleIds = new Set(existingRoles.map(r => r.id));
      const hasAllRoles = allRoles.every(role => roleIds.has(role.id));

      if (!hasAllRoles) {
        admin.roles = allRoles;
      }

      admin.isOwner = true;
      admin.password = null;
      admin.passwordSetupDeadlineAt = null;
      admin.telegramAuthToken = null;
      admin.telegramAuthTokenExpAt = null;

      if (admin.adminTelegram) {
        admin.adminTelegram.telegramId = GenerateAdminMigration.OWNER_TG_ID;
        admin.adminTelegram.username = ADMIN_TG_USERNAME || admin.adminTelegram.username;
      } else {
        await queryRunner.manager.save(this.adminTgRepository.target, {
          adminId: admin.id,
          telegramId: GenerateAdminMigration.OWNER_TG_ID,
          username: ADMIN_TG_USERNAME || null,
          createdAt: new Date(),
        });
      }

      await queryRunner.manager.save(this.adminRepository.target, admin);
      this.logger.warn(
        `Owner admin already exists and was synced, email: ${ADMIN_EMAIL}, username: ${ADMIN_USERNAME}`,
      );
      return;
    }

    const result = await queryRunner.manager.save(this.adminRepository.target, {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: null,
      isOwner: true,
      passwordSetupDeadlineAt: null,
      createdAt: new Date(),
      roles: allRoles,
    });

    await queryRunner.manager.save(this.adminTgRepository.target, {
      adminId: result.id,
      telegramId: GenerateAdminMigration.OWNER_TG_ID,
      username: ADMIN_TG_USERNAME,
      createdAt: new Date(),
    });
  }
}

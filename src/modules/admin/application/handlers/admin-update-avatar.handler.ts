import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { AdminRepository } from '@/admin/infrastructure/admin.repository';
import { AdminRoleEnum } from '@/common/enums/admin-role.enum';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DownloaderServiceAdapter } from '@/common/infrastructure/rmq/downloader-service.adapter';
import { RmqResultHandlerUtil } from '@/common/utils/rmq-result-handler.util';
import * as path from 'path';
import { ImgExtEnum } from '@/common/types/types';

export class AdminUpdateAvatarCommand implements ICommand {
  constructor(
    public file: Express.Multer.File,
    public userId: number,
    public currentUserId: number,
  ) {}
}

@CommandHandler(AdminUpdateAvatarCommand)
export class AdminUpdateAvatarCommandHandler
  implements
    ICommandHandler<
      AdminUpdateAvatarCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly adminRepository: AdminRepository,
    private readonly downloaderServiceAdapter: DownloaderServiceAdapter,
    private readonly rmqResultHandlerUtil: RmqResultHandlerUtil,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(AdminUpdateAvatarCommandHandler.name);
  }
  async execute(
    command: AdminUpdateAvatarCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    const { file, userId, currentUserId } = command;
    this.logger.log(`Admin upload avatar command`, this.execute.name);

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const tasks = [this.adminRepository.getAdminByIdWithTelegramInfo(userId, queryRunner)];

      if (userId !== currentUserId) {
        tasks.push(this.adminRepository.getAdminByIdWithRoleInfo(currentUserId, queryRunner));
      }

      const [admin, currentAdmin] = await Promise.all(tasks);

      if (userId !== currentUserId) {
        if (
          !currentAdmin ||
          !currentAdmin.isActive ||
          !currentAdmin.roles.some(role => role.name === AdminRoleEnum.ADMIN)
        ) {
          await queryRunner.rollbackTransaction();
          return this.appNotification.forbidden({
            field: 'id',
            message: 'No access',
            errorKey: EXCEPTION_KEYS_ENUM.NO_ACCESS,
          });
        }
      }

      if (!admin) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.notFound({
          field: 'id',
          message: 'User not found',
          errorKey: EXCEPTION_KEYS_ENUM.USER_NOT_FOUND,
        });
      }

      let extension = path.extname(file.originalname);
      if (!extension) {
        extension = `.${file.mimetype.split('/')[1]}`;
      }
      const { data } = await this.rmqResultHandlerUtil.getRmqData(
        () =>
          this.downloaderServiceAdapter.adminUploadAvatar(
            file,
            extension as ImgExtEnum,
            userId,
            admin.avatarUrl,
          ),
        'Upload admin avatar',
      );

      if (!data) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.internalServerError();
      }

      admin.updateAvatar(data);
      await this.adminRepository.save(admin, queryRunner);

      await queryRunner.commitTransaction();
      return this.appNotification.success(null);
    } catch (e) {
      this.logger.error(e, this.execute.name);
      await queryRunner.rollbackTransaction();
      return this.appNotification.internalServerError();
    } finally {
      await queryRunner.release();
    }
  }
}

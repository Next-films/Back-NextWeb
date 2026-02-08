import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { EXCEPTION_KEYS_ENUM } from '@/common/enums/exception-keys.enum';
import { SerialRepository } from '@/serials/infrastructure/serial.repository';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export class NewBackGroundContentSerialCommand implements ICommand {
  constructor(
    public url: string,
    public serialId: number,
  ) {}
}

@CommandHandler(NewBackGroundContentSerialCommand)
export class NewBackGroundContentSerialCommandHandler
  implements
    ICommandHandler<
      NewBackGroundContentSerialCommand,
      AppNotificationResult<null, ErrorFieldExceptionDto | null>
    >
{
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly serialRepository: SerialRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger.setContext(NewBackGroundContentSerialCommandHandler.name);
  }

  async execute(
    command: NewBackGroundContentSerialCommand,
  ): Promise<AppNotificationResult<null, ErrorFieldExceptionDto | null>> {
    this.logger.log(`New background content serial command`, this.execute.name);
    const { url, serialId } = command;

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const serial = await this.serialRepository.getSerialById(serialId, queryRunner);

      if (!serial) {
        await queryRunner.rollbackTransaction();
        return this.appNotification.badRequest({
          errorKey: EXCEPTION_KEYS_ENUM.SERIAL_NOT_FOUND,
          message: 'Serial not found',
          field: 'serialId',
        });
      }

      serial.updateBackgroundUrl(url);

      await this.serialRepository.save(serial, queryRunner);

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

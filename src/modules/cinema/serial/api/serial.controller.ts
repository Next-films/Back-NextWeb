import { Controller, Get, Param, Query } from '@nestjs/common';
import { SERIALS_ROUTE } from '@/common/constants/route.constants';
import { ApiTags } from '@nestjs/swagger';
import { PaginationUtil } from '@/common/utils/pagination.util';
import {
  ApplicationNotification,
  AppNotificationResult,
  AppNotificationResultEnum,
} from '@/common/utils/app-notification.util';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { ParseIntPatchPipe } from '@/common/pipes/validation-parse-int.pipe';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { QueryBus } from '@nestjs/cqrs';
import { SwaggerDecoratorGetSerials } from '@/serials/api/swagger/get-serials.swagger.decorator';
import { SwaggerDecoratorGetSerialById } from '@/serials/api/swagger/get-serial-by-id.swagger.decorator';
import { GetSerialsQuery } from '@/serials/application/query-handlers/get-serials.query-handler';
import { GetSerialByIdQuery } from '@/serials/application/query-handlers/get-serial-by-id.query-handler';
import { SerialsOutputDto } from '@/serials/api/dtos/output/serials.output.dto';
import { GetSerialInputQuery } from '@/serials/api/dtos/input/get-serial.input-query';
import { SwaggerDecoratorGetSerialEpisodes } from '@/serials/api/swagger/get-serial-episode-by-id.swagger.decorator';
import { SerialEpisodeOutputDto } from '@/serials/api/dtos/output/serial-episode.output.dto';
import { GetSerialEpisodeByIdQuery } from '@/serials/application/query-handlers/get-serial-episode-by-id.query-handler';

@ApiTags('Public - serials')
@Controller(SERIALS_ROUTE.MAIN)
export class SerialController {
  constructor(
    private readonly logger: LoggerService,
    private readonly appNotification: ApplicationNotification,
    private readonly queryBus: QueryBus,
  ) {
    this.logger.setContext(SerialController.name);
  }

  @Get()
  @SwaggerDecoratorGetSerials()
  async getAllSerials(
    @Query() query: GetSerialInputQuery,
  ): Promise<PaginationUtil<SerialsOutputDto[]> | void> {
    this.logger.log(`Execute: Get serials`, this.getAllSerials.name);

    const result = await this.queryBus.execute<
      GetSerialsQuery,
      AppNotificationResult<PaginationUtil<SerialsOutputDto[]>, ErrorFieldExceptionDto | null>
    >(new GetSerialsQuery(query));

    this.logger.log(result.appResult, this.getAllSerials.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(`:serialId`)
  @SwaggerDecoratorGetSerialById()
  async getSerialById(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
  ): Promise<SerialsOutputDto | void> {
    this.logger.log(`Execute: Get serial by id: ${serialId}`, this.getSerialById.name);

    const result = await this.queryBus.execute<
      GetSerialByIdQuery,
      AppNotificationResult<SerialsOutputDto, ErrorFieldExceptionDto | null>
    >(new GetSerialByIdQuery(serialId));

    this.logger.log(result.appResult, this.getSerialById.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }

  @Get(`:serialId/:episodeId`)
  @SwaggerDecoratorGetSerialEpisodes()
  async getSerialEpisodeById(
    @Param('serialId', ParseIntPatchPipe) serialId: number,
    @Param('episodeId', ParseIntPatchPipe) episodeId: number,
  ): Promise<SerialEpisodeOutputDto | void> {
    this.logger.log(
      `Execute: Get serial episode by id: ${serialId}, ${episodeId}`,
      this.getSerialEpisodeById.name,
    );

    const result = await this.queryBus.execute<
      GetSerialEpisodeByIdQuery,
      AppNotificationResult<SerialEpisodeOutputDto, ErrorFieldExceptionDto | null>
    >(new GetSerialEpisodeByIdQuery(serialId, episodeId));

    this.logger.log(result.appResult, this.getSerialEpisodeById.name);
    if (result.appResult === AppNotificationResultEnum.Success) return result.data!;

    this.appNotification.handleHttpResult(result);
  }
}

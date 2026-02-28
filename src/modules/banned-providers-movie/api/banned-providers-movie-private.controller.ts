import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApplicationNotification,
  AppNotificationResult,
} from '@/common/utils/app-notification.util';
import { BanProviderMovieCommand } from '@/banned-providers-movie/application/handlers/ban-provider-movie.handler';
import { GetBannedMovieByProviderRpcQuery } from '@/banned-providers-movie/application/query-handlers/get-banned-movie-by-provider-rpc.query-handler';
import { BannedMoviesByProviderRpcOutputDto } from '@/banned-providers-movie/api/dtos/output/banned-movies-by-provider-rpc.output.dto';
import { ErrorFieldExceptionDto } from '@/common/exception-filters/http/http-exception.filter';
import { BanProviderMoviePayloadDto } from '@/banned-providers-movie/api/dtos/input/ban-provider-movie-rpc.input.dto';
import { ApiCinemaAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-access-token.guard';
import {
  HttpPrivateExceptionDto,
  HttpPrivateExceptionsFilter,
} from '@/common/exception-filters/http/http-private-exception.filter';
import { PRIVATE_BANNED_PROVIDERS_ROUTE } from '@/common/constants/route.constants';
import { TorApiProvidersEnum } from '@/common/types/types';
import { SwaggerDecoratorBanProvider } from '@/banned-providers-movie/api/swagger/private-ban-provider.swagger.decorator';
import { SwaggerDecoratorGetBanProvider } from '@/banned-providers-movie/api/swagger/private-get-ban-provider.swagger.decorator';
import { ParseProviderPipe } from '@/common/pipes/validation-provider-params.pipe';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: HttpPrivateExceptionDto })
@UseGuards(ApiCinemaAccessTokenGuard)
@ApiTags('Private - banned providers movies. Only for interaction between backends')
@UseFilters(HttpPrivateExceptionsFilter)
@Controller(PRIVATE_BANNED_PROVIDERS_ROUTE.MAIN)
export class BannedProvidersMoviePrivateController {
  constructor(
    private readonly logger: LoggerService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appNotification: ApplicationNotification,
  ) {
    this.logger.setContext(BannedProvidersMoviePrivateController.name);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @SwaggerDecoratorBanProvider()
  async banProviderMovie(
    @Body() payload: BanProviderMoviePayloadDto,
  ): Promise<AppNotificationResult<null> | void> {
    this.logger.log(`Execute: ban provider movie`, this.banProviderMovie.name);

    const result = await this.commandBus.execute<
      BanProviderMovieCommand,
      AppNotificationResult<null>
    >(new BanProviderMovieCommand(payload));

    this.logger.log(result.appResult, this.banProviderMovie.name);

    return this.appNotification.handleHttpResult(result, true);
  }

  @Get(`:provider/:providerId`)
  @SwaggerDecoratorGetBanProvider()
  async getBannedMovieByProvider(
    @Param('providerId') providerId: string,
    @Param('provider', new ParseProviderPipe()) provider: TorApiProvidersEnum,
  ): Promise<AppNotificationResult<
    BannedMoviesByProviderRpcOutputDto,
    ErrorFieldExceptionDto | null
  > | void> {
    this.logger.log(`Execute: get banned movie by provider`, this.getBannedMovieByProvider.name);

    const result = await this.queryBus.execute<
      GetBannedMovieByProviderRpcQuery,
      AppNotificationResult<BannedMoviesByProviderRpcOutputDto, ErrorFieldExceptionDto | null>
    >(new GetBannedMovieByProviderRpcQuery(provider, providerId));

    this.logger.log(result.appResult, this.getBannedMovieByProvider.name);

    return this.appNotification.handleHttpResult(result, true);
  }
}

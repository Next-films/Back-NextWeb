import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExternalApiTokenOutputDto } from '@/admin/api/dtos/output/external-api-tokens.output.dto';
import { ApiCinemaCheckAccessTokenGuard } from '@/external-auth/application/guards/jwt/api-cinema-check-token.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ExternalApiTokenCheckOutputDto } from '@/external-auth/api/dtos/output/external-api-token-check.output.dto';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { SwaggerDecoratorExternalTokenCheck } from '@/external-auth/api/swagger/external-token-check.swagger.decorator';
import { EXTERNAL_API_ROUTE } from '@/common/constants/route.constants';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME } from '@/common/constants/auth-jwt-schema-name.constants';

@ApiBearerAuth(BACKEND_TO_BACKEND_AUTH_JWT_SCHEMA_NAME)
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiTags('External api. Authentication for backend-to-backend service communication.')
@UseGuards(ApiCinemaCheckAccessTokenGuard)
@Controller(EXTERNAL_API_ROUTE.MAIN)
export class ExternalApiAuthController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ExternalApiAuthController.name);
  }

  @Get(`${EXTERNAL_API_ROUTE.TOKEN}/${EXTERNAL_API_ROUTE.CHECK}`)
  @SwaggerDecoratorExternalTokenCheck()
  checkToken(
    @CurrentUser() token: ExternalApiTokenCheckOutputDto,
  ): ExternalApiTokenOutputDto | void {
    this.logger.log('Check external api token health', this.checkToken.name);
    return token;
  }
}

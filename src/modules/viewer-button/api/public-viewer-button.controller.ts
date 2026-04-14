import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VIEWER_BUTTON_ROUTE } from '@/common/constants/route.constants';
import { LoggerService } from '@/common/utils/logger/logger.service';
import { ViewerButtonOutputDto } from '@/viewer-button/api/dtos/output/viewer-button.output.dto';
import { ViewerButtonRepository } from '@/viewer-button/infrastructure/viewer-button.repository';

const MAX_PUBLIC_VIEWER_BUTTONS = 4;

@ApiTags('Public - viewer buttons')
@Controller(VIEWER_BUTTON_ROUTE.MAIN)
export class PublicViewerButtonController {
  constructor(
    private readonly logger: LoggerService,
    private readonly viewerButtonRepository: ViewerButtonRepository,
  ) {
    this.logger.setContext(PublicViewerButtonController.name);
  }

  @Get()
  async getActiveViewerButtons(): Promise<ViewerButtonOutputDto[]> {
    this.logger.log('Execute: get active viewer buttons', this.getActiveViewerButtons.name);
    const entities = await this.viewerButtonRepository.findAllActive();
    return entities
      .slice(0, MAX_PUBLIC_VIEWER_BUTTONS)
      .map(entity => ViewerButtonOutputDto.fromEntity(entity));
  }
}

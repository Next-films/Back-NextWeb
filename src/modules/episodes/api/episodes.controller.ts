import { Controller, Patch, Param, Body, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EpisodesService } from '../episodes.service';
import { UpdateEpisodeDto } from '../api/dtos/update-episode.dto';

@ApiTags('Episodes')
@Controller('movies/:movieId/episodes')
export class EpisodesController {
    constructor(private readonly episodesService: EpisodesService) {}

    @Patch(':episodeId')
    @ApiOperation({ summary: 'Update episode' })
    @ApiResponse({ status: 200, description: 'Episode updated' })
    async updateEpisode(
        @Param('episodeId', ParseIntPipe) episodeId: number,
        @Body() dto: UpdateEpisodeDto,
    ) {
        return this.episodesService.update(episodeId, dto);
    }

    @Delete(':episodeId')
    @ApiOperation({ summary: 'Delete episode' })
    @ApiResponse({ status: 200, description: 'Episode deleted' })
    async deleteEpisode(
        @Param('episodeId', ParseIntPipe) episodeId: number,
    ) {
        await this.episodesService.delete(episodeId);
        return { message: 'Episode deleted' };
    }
}

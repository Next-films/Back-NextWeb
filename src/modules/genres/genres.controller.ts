import { Controller, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { GenresService } from './genres.service';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Controller('genres')
export class GenresController {
    constructor(private readonly genresService: GenresService) {}

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateGenreDto: UpdateGenreDto,
    ) {
        return this.genresService.update(id, updateGenreDto);
    }
}

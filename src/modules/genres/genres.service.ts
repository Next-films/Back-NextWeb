import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenreEntity } from './domain/genre.entity';
import { Repository } from 'typeorm';
import { UpdateGenreDto } from './api/dtos/update-genre.dto';

@Injectable()
export class GenresService {
    constructor(
        @InjectRepository(GenreEntity)
        private readonly genreRepository: Repository<GenreEntity>,
    ) {}

    async update(id: number, updateGenreDto: UpdateGenreDto): Promise<GenreEntity> {
        const genre = await this.genreRepository.preload({
            id,
            ...updateGenreDto,
        });

        if (!genre) {
            throw new NotFoundException(`Genre with ID ${id} not found`);
        }

        return this.genreRepository.save(genre);
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';
import { GenreEntity } from '@/movies/domain/genre.entity';
import { Repository } from 'typeorm';
import { UpdateMovieDto } from './api/dtos/output/update-movie.output.dto';

@Injectable()
export class MoviesService {
    constructor(
        @InjectRepository(MovieEntity)
        private readonly movieRepo: Repository<MovieEntity>,

        @InjectRepository(GenreEntity)
        private readonly genreRepo: Repository<GenreEntity>,
    ) {}

    async update(id: number, dto: UpdateMovieDto): Promise<MovieEntity> {
        const movie = await this.movieRepo.findOne({
            where: { id },
            relations: ['genres'],
        });

        if (!movie) throw new NotFoundException('Movie not found');

        if (dto.genres) {
            const genres = await this.genreRepo.findByIds(dto.genres);
            movie.genres = genres;
        }

        Object.assign(movie, dto);

        return await this.movieRepo.save(movie);
    }
}

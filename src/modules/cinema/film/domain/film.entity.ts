import { Entity } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';

@Entity()
export class Film extends MovieEntity {}

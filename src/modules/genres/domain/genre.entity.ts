import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { MovieEntity } from '@/movies/domain/movie.entity';

@Entity('genres')
export class GenreEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description?: string;

    @ManyToMany(() => MovieEntity, (movie: any) => movie.genres)
    movies: MovieEntity[];
}

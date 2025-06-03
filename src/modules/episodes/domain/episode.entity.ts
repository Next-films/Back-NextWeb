import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MovieEntity } from '../../cinema/movies/domain/movie.entity';

@Entity('episodes')
export class EpisodeEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    originalTitle: string;

    @Column()
    description: string;

    @Column()
    previewUrl: string;

    @Column({ type: 'date' })
    releaseDate: Date;

    @ManyToOne(() => MovieEntity, (movie) => movie.episodes, { onDelete: 'CASCADE' })
    movie: MovieEntity;
}

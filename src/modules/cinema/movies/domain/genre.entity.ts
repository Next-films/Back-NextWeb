import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  static create(name: string): Genre {
    const genre = new this();
    genre.name = name;

    return genre;
  }
}

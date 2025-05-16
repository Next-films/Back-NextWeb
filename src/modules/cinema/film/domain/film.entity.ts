import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// TODO:
@Entity()
export class Film {
  @PrimaryGeneratedColumn()
  id: number; // "Joker: Madness for two"

  @Column()
  backgroundImg: string; // "https://next-films.ru/films/djoker/trailer.webm"

  @Column()
  cardImg: string; // "https://next-films.ru/films/djoker/poster.jpg"

  @Column()
  description: string; // "Находясь на принудительном лечении в больнице Аркхем..."

  @Column()
  subTitle: string; // "2024 г. ‧ Дрма/Криминал/Триллер ‧ 2 ч 18 мин"

  @Column()
  title: string; // "Джокер: Безумие на двоих"

  @Column()
  titleImg: string; // "https://next-films.ru/films/djoker/logo.png"

  @Column()
  type: string; // "films"

  @Column()
  films: string; // "https://next-films.ru/films/djoker/..."

  @Column()
  trailer: string; // "https://www.youtube.com/watch?v=j7jPnwVGdZ8"

  @Column()
  name: string; // "Джокер: Безумие на двоих, Джокер 2, ..."

  @Column()
  date: string; // "04/09/2024"

  @Column()
  filtr: string[]; // ["Драма", "Криминал", "Триллер"]
}

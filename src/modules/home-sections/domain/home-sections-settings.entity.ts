import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('home_sections_settings')
export class HomeSectionsSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  showFilms: boolean;

  @Column({ default: true })
  showSerials: boolean;

  @Column({ default: true })
  showCartoons: boolean;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  static createDefault(): HomeSectionsSettings {
    const entity = new HomeSectionsSettings();
    entity.showFilms = true;
    entity.showSerials = true;
    entity.showCartoons = true;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }

  update(showFilms?: boolean, showSerials?: boolean, showCartoons?: boolean): void {
    if (showFilms !== undefined) this.showFilms = showFilms;
    if (showSerials !== undefined) this.showSerials = showSerials;
    if (showCartoons !== undefined) this.showCartoons = showCartoons;
    this.updatedAt = new Date();
  }
}

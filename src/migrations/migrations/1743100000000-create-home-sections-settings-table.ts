import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHomeSectionsSettingsTable1743100000000 implements MigrationInterface {
  name = 'CreateHomeSectionsSettingsTable1743100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "home_sections_settings" (
        "id" SERIAL NOT NULL,
        "showFilms" boolean NOT NULL DEFAULT true,
        "showSerials" boolean NOT NULL DEFAULT true,
        "showCartoons" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_home_sections_settings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "home_sections_settings" ("showFilms", "showSerials", "showCartoons", "createdAt", "updatedAt")
      SELECT true, true, true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "home_sections_settings")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "home_sections_settings"`);
  }
}

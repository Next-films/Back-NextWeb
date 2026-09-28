import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlaybackSettingsTable1788200000000 implements MigrationInterface {
  name = 'CreatePlaybackSettingsTable1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "playback_settings" (
        "id" SERIAL NOT NULL,
        "provider" varchar(16) NOT NULL DEFAULT 'vibix',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_playback_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_playback_settings_provider" CHECK ("provider" IN ('vibix', 'legacy'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO "playback_settings" ("provider", "createdAt", "updatedAt")
      SELECT 'vibix', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "playback_settings")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "playback_settings"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClipDeletedAtToSocialPublications1791680000000 implements MigrationInterface {
  name = 'AddClipDeletedAtToSocialPublications1791680000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publications"
      ADD COLUMN IF NOT EXISTS "clipDeletedAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_social_publications_pending_clip_cleanup"
      ON "social_publications" ("updatedAt")
      WHERE "status" = 'published' AND "clipDeletedAt" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_social_publications_pending_clip_cleanup"`);
    await queryRunner.query(`
      ALTER TABLE "social_publications"
      DROP COLUMN IF EXISTS "clipDeletedAt"
    `);
  }
}

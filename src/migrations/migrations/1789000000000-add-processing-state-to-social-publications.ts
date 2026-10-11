import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingStateToSocialPublications1789000000000 implements MigrationInterface {
  name = 'AddProcessingStateToSocialPublications1789000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."social_publication_status_enum"
      ADD VALUE IF NOT EXISTS 'processing' AFTER 'submitting'
    `);
    await queryRunner.query(`
      ALTER TABLE "social_publications"
      ADD COLUMN IF NOT EXISTS "externalUploadId" character varying,
      ADD COLUMN IF NOT EXISTS "externalFileId" character varying
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publications"
      DROP COLUMN IF EXISTS "externalFileId",
      DROP COLUMN IF EXISTS "externalUploadId"
    `);
    // PostgreSQL enum values cannot be removed safely without recreating the type.
  }
}

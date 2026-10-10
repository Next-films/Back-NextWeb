import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFailurePauseToSocialPublishingRules1788900000000 implements MigrationInterface {
  name = 'AddFailurePauseToSocialPublishingRules1788900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      ADD COLUMN IF NOT EXISTS "pausedByFailure" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "pauseReason" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      DROP COLUMN IF EXISTS "pauseReason",
      DROP COLUMN IF EXISTS "pausedAt",
      DROP COLUMN IF EXISTS "pausedByFailure"
    `);
  }
}

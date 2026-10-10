import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEndAtToSocialPublishingRules1788800000000 implements MigrationInterface {
  name = 'AddEndAtToSocialPublishingRules1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      DROP COLUMN IF EXISTS "endAt"
    `);
  }
}

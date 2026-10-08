import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyTimesToSocialPublishingRules1788700000000 implements MigrationInterface {
  name = 'AddDailyTimesToSocialPublishingRules1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      ADD COLUMN IF NOT EXISTS "dailyTimes" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "social_publishing_rules"
      DROP COLUMN IF EXISTS "dailyTimes"
    `);
  }
}

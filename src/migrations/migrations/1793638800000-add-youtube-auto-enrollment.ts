import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYoutubeAutoEnrollment1793638800000 implements MigrationInterface {
  name = 'AddYoutubeAutoEnrollment1793638800000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE social_publishing_rules ADD COLUMN IF NOT EXISTS "autoEnqueueYoutube" boolean NOT NULL DEFAULT false`,
    );
    await runner.query(
      `ALTER TABLE social_youtube_clips ADD COLUMN IF NOT EXISTS "enrollmentMode" varchar(10) NOT NULL DEFAULT 'manual'`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    const rows = await runner.query(
      `SELECT 1 FROM social_youtube_clips WHERE "enrollmentMode" = 'automatic' LIMIT 1`,
    );
    if (rows.length)
      throw new Error('Automatic publication history exists; export it before reverting');
    await runner.query(`ALTER TABLE social_publishing_rules DROP COLUMN "autoEnqueueYoutube"`);
    await runner.query(`ALTER TABLE social_youtube_clips DROP COLUMN "enrollmentMode"`);
  }
}

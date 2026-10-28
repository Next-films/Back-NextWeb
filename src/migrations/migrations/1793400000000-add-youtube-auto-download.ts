import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYoutubeAutoDownload1793400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "admin_youtube_automation" (
      "id" integer PRIMARY KEY CHECK ("id"=1), "enabled" boolean NOT NULL DEFAULT false,
      "includeArchive" boolean NOT NULL DEFAULT true, "lastError" text NULL,
      "lastRunAt" timestamptz NULL, "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`ALTER TABLE "admin_youtube_sources"
      ADD COLUMN "archiveState" jsonb NULL, ADD COLUMN "archiveComplete" boolean NOT NULL DEFAULT false,
      ADD COLUMN "archiveError" text NULL, ADD COLUMN "archiveCompletedAt" timestamptz NULL`);
    await runner.query(`ALTER TABLE "admin_youtube_videos"
      ADD COLUMN "downloadStatus" varchar(20) NULL, ADD COLUMN "downloadAttempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN "downloadRetryAt" timestamptz NULL, ADD COLUMN "downloadError" text NULL,
      ADD COLUMN "downloadUpdatedAt" timestamptz NULL`);
    await runner.query(
      'CREATE INDEX "IDX_youtube_download_status" ON "admin_youtube_videos" ("downloadStatus", "downloadRetryAt")',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX "IDX_youtube_download_status"');
    await runner.query(`ALTER TABLE "admin_youtube_videos" DROP COLUMN "downloadStatus", DROP COLUMN "downloadAttempts",
      DROP COLUMN "downloadRetryAt", DROP COLUMN "downloadError", DROP COLUMN "downloadUpdatedAt"`);
    await runner.query(
      'ALTER TABLE "admin_youtube_sources" DROP COLUMN "archiveState", DROP COLUMN "archiveComplete", DROP COLUMN "archiveError", DROP COLUMN "archiveCompletedAt"',
    );
    await runner.query('DROP TABLE "admin_youtube_automation"');
  }
}

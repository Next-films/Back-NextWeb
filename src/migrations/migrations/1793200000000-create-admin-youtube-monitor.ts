import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminYoutubeMonitor1793200000000 implements MigrationInterface {
  name = 'CreateAdminYoutubeMonitor1793200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "admin_youtube_sources" (
      "source" varchar(300) PRIMARY KEY, "enabled" boolean NOT NULL DEFAULT true,
      "channelId" varchar(24), "channelName" varchar(500),
      "lastSyncedAt" timestamptz, "lastAttemptAt" timestamptz, "lastError" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "admin_youtube_videos" (
      "videoId" varchar(11) PRIMARY KEY, "channelId" varchar(24) NOT NULL,
      "title" varchar(500) NOT NULL, "description" text, "thumbnailUrl" varchar(1000),
      "publishedAt" timestamptz, "likes" varchar(80), "comments" varchar(80),
      "commentsUpdatedAt" timestamptz, "lastSyncedAt" timestamptz,
      "lastAttemptAt" timestamptz NOT NULL, "lastError" text,
      "firstSeenAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_admin_youtube_video_channel" ON "admin_youtube_videos" ("channelId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "admin_youtube_videos"');
    await queryRunner.query('DROP TABLE IF EXISTS "admin_youtube_sources"');
  }
}

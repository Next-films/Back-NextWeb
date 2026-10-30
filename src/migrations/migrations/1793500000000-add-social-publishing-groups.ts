import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialPublishingGroups1793500000000 implements MigrationInterface {
  name = 'AddSocialPublishingGroups1793500000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE social_publishing_rules
      ADD COLUMN "sourceGroups" jsonb NOT NULL DEFAULT '["own"]'::jsonb,
      ADD COLUMN "groupStrategy" varchar(20) NOT NULL DEFAULT 'alternate',
      ADD COLUMN "firstGroup" varchar(10) NOT NULL DEFAULT 'own',
      ADD COLUMN "ownPerCycle" integer NOT NULL DEFAULT 1 CHECK ("ownPerCycle" BETWEEN 1 AND 20),
      ADD COLUMN "youtubePerCycle" integer NOT NULL DEFAULT 1 CHECK ("youtubePerCycle" BETWEEN 1 AND 20),
      ADD COLUMN "fallbackToOtherGroup" boolean NOT NULL DEFAULT true,
      ADD COLUMN "groupCursor" integer NOT NULL DEFAULT 0 CHECK ("groupCursor" >= 0)`);
    await runner.query(`CREATE TABLE social_youtube_clips (
      id varchar(64) PRIMARY KEY, "videoId" varchar(11) NOT NULL, revision integer NOT NULL,
      title text NOT NULL, description text, "createdAt" timestamptz NOT NULL DEFAULT now(), "deletedAt" timestamptz,
      CONSTRAINT "UQ_social_youtube_clip_revision" UNIQUE ("videoId", revision))`);
    await runner.query(`ALTER TABLE social_publications
      ALTER COLUMN "shortContentJobId" DROP NOT NULL,
      ADD COLUMN "sourceGroup" varchar(10) NOT NULL DEFAULT 'own',
      ADD COLUMN "youtubeAssetId" varchar(64) REFERENCES social_youtube_clips(id) ON DELETE RESTRICT,
      ADD CONSTRAINT "CK_social_publication_source" CHECK (
        ("sourceGroup" = 'own' AND "shortContentJobId" IS NOT NULL AND "youtubeAssetId" IS NULL) OR
        ("sourceGroup" = 'youtube' AND "shortContentJobId" IS NULL AND "youtubeAssetId" IS NOT NULL))`);
    await runner.query(
      `CREATE UNIQUE INDEX "UQ_social_publication_rule_youtube" ON social_publications ("ruleId", "youtubeAssetId")`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    // Do not silently destroy history that cannot be represented by the old schema.
    const rows = await runner.query(
      `SELECT 1 FROM social_publications WHERE "sourceGroup" = 'youtube' LIMIT 1`,
    );
    if (rows.length)
      throw new Error('YouTube publication history exists; export it before reverting');
    await runner.query(
      `ALTER TABLE social_publications DROP CONSTRAINT "CK_social_publication_source"`,
    );
    await runner.query(`DROP INDEX "UQ_social_publication_rule_youtube"`);
    await runner.query(
      `ALTER TABLE social_publications DROP COLUMN "youtubeAssetId", DROP COLUMN "sourceGroup", ALTER COLUMN "shortContentJobId" SET NOT NULL`,
    );
    await runner.query(`DROP TABLE social_youtube_clips`);
    await runner.query(
      `ALTER TABLE social_publishing_rules DROP COLUMN "sourceGroups", DROP COLUMN "groupStrategy", DROP COLUMN "firstGroup", DROP COLUMN "ownPerCycle", DROP COLUMN "youtubePerCycle", DROP COLUMN "fallbackToOtherGroup", DROP COLUMN "groupCursor"`,
    );
  }
}

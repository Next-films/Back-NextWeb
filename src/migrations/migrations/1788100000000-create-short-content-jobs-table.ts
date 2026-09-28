import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShortContentJobsTable1788100000000 implements MigrationInterface {
  name = 'CreateShortContentJobsTable1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'short_content_type_enum') THEN
          CREATE TYPE "public"."short_content_type_enum" AS ENUM('film', 'cartoon', 'serial');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'short_content_job_status_enum') THEN
          CREATE TYPE "public"."short_content_job_status_enum" AS ENUM(
            'draft_requested',
            'drafted',
            'approved',
            'render_requested',
            'rendered',
            'failed',
            'rejected'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "short_content_jobs" (
        "id" SERIAL NOT NULL,
        "contentType" "public"."short_content_type_enum" NOT NULL,
        "contentId" integer NOT NULL,
        "contentTitle" character varying,
        "status" "public"."short_content_job_status_enum" NOT NULL DEFAULT 'draft_requested',
        "requestPayload" jsonb NOT NULL,
        "draftPayload" jsonb,
        "shortContentJobId" character varying,
        "errorMessage" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_short_content_jobs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_short_content_jobs_content" ON "short_content_jobs" ("contentType", "contentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_short_content_jobs_status_createdAt" ON "short_content_jobs" ("status", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_short_content_jobs_status_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_short_content_jobs_content"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "short_content_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."short_content_job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."short_content_type_enum"`);
  }
}

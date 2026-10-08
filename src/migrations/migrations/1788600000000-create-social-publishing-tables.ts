import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialPublishingTables1788600000000 implements MigrationInterface {
  name = 'CreateSocialPublishingTables1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_publishing_provider_enum') THEN
          CREATE TYPE "public"."social_publishing_provider_enum" AS ENUM('postmypost');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_publication_status_enum') THEN
          CREATE TYPE "public"."social_publication_status_enum" AS ENUM(
            'queued', 'submitting', 'scheduled', 'published', 'failed'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_publishing_rules" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "provider" "public"."social_publishing_provider_enum" NOT NULL,
        "projectId" integer NOT NULL,
        "accountIds" jsonb NOT NULL,
        "contentTypes" jsonb NOT NULL DEFAULT '["film","cartoon","serial"]'::jsonb,
        "intervalMinutes" integer NOT NULL,
        "startAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "nextRunAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "timezone" character varying(100) NOT NULL DEFAULT 'Europe/Moscow',
        "titleTemplate" text,
        "captionTemplate" text,
        "isEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_publishing_rules_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "social_publications" (
        "id" SERIAL NOT NULL,
        "ruleId" integer NOT NULL,
        "shortContentJobId" integer NOT NULL,
        "clipIndex" integer NOT NULL,
        "provider" "public"."social_publishing_provider_enum" NOT NULL,
        "status" "public"."social_publication_status_enum" NOT NULL DEFAULT 'queued',
        "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "externalPublicationId" character varying,
        "providerPayload" jsonb,
        "errorMessage" text,
        "attempts" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_publications_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_social_publication_rule_clip" UNIQUE ("ruleId", "shortContentJobId", "clipIndex"),
        CONSTRAINT "FK_social_publications_rule" FOREIGN KEY ("ruleId")
          REFERENCES "social_publishing_rules"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_publishing_rules_due" ON "social_publishing_rules" ("isEnabled", "nextRunAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_social_publications_status" ON "social_publications" ("status", "scheduledAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "social_publications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_publishing_rules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."social_publication_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."social_publishing_provider_enum"`);
  }
}

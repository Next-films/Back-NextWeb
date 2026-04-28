import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsEventTable1743500000000 implements MigrationInterface {
  name = 'CreateAnalyticsEventTable1743500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_event_type_enum') THEN
          CREATE TYPE "public"."analytics_event_type_enum" AS ENUM('visit', 'view');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_event_contenttype_enum') THEN
          CREATE TYPE "public"."analytics_event_contenttype_enum" AS ENUM('film', 'serial', 'cartoon');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_event" (
        "id" SERIAL NOT NULL,
        "type" "public"."analytics_event_type_enum" NOT NULL,
        "contentType" "public"."analytics_event_contenttype_enum",
        "contentId" integer,
        "visitorId" character varying,
        "ip" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_event_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_analytics_event_type_createdAt" ON "analytics_event" ("type", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_analytics_event_contentType_contentId" ON "analytics_event" ("contentType", "contentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_event_contentType_contentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_event_type_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_event"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."analytics_event_contenttype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."analytics_event_type_enum"`);
  }
}

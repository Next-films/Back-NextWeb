import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateViewerButtonsTable1742900000000 implements MigrationInterface {
  name = 'CreateViewerButtonsTable1742900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "viewer_buttons" (
        "id" SERIAL NOT NULL,
        "imageUrl" character varying NOT NULL,
        "hoverVideoUrl" character varying,
        "linkUrl" character varying,
        "sortOrder" integer NOT NULL DEFAULT '0',
        "openInNewTab" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_viewer_buttons_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'banners'
            AND column_name = 'buttonImageUrl'
        ) THEN
          INSERT INTO "viewer_buttons" (
            "imageUrl",
            "hoverVideoUrl",
            "linkUrl",
            "sortOrder",
            "openInNewTab",
            "isActive",
            "createdAt",
            "updatedAt"
          )
          SELECT
            b."buttonImageUrl",
            b."buttonHoverVideoUrl",
            b."linkUrl",
            b."sortOrder",
            b."openInNewTab",
            b."isActive",
            NOW(),
            NOW()
          FROM "banners" b
          WHERE b."buttonImageUrl" IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM "viewer_buttons")
          ORDER BY b."sortOrder" ASC, b."id" ASC
          LIMIT 4;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "viewer_buttons"`);
  }
}

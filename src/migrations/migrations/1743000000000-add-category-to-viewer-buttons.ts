import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryToViewerButtons1743000000000 implements MigrationInterface {
  name = 'AddCategoryToViewerButtons1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "viewer_buttons" ADD COLUMN IF NOT EXISTS "category" character varying`,
    );

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          vb."id",
          ROW_NUMBER() OVER (ORDER BY vb."sortOrder" ASC, vb."id" ASC) AS rn
        FROM "viewer_buttons" vb
        WHERE vb."category" IS NULL
      )
      UPDATE "viewer_buttons" vb
      SET "category" = CASE
        WHEN ranked.rn = 1 THEN 'films'
        WHEN ranked.rn = 2 THEN 'serials'
        WHEN ranked.rn = 3 THEN 'cartoons'
        ELSE NULL
      END
      FROM ranked
      WHERE vb."id" = ranked."id"
    `);

    await queryRunner.query(`DELETE FROM "viewer_buttons" WHERE "category" IS NULL`);

    await queryRunner.query(`
      DELETE FROM "viewer_buttons" vb
      USING (
        SELECT
          x."id",
          ROW_NUMBER() OVER (PARTITION BY x."category" ORDER BY x."sortOrder" ASC, x."id" ASC) AS rn
        FROM "viewer_buttons" x
      ) dup
      WHERE vb."id" = dup."id"
        AND dup.rn > 1
    `);

    await queryRunner.query(`ALTER TABLE "viewer_buttons" ALTER COLUMN "category" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_viewer_buttons_category'
        ) THEN
          ALTER TABLE "viewer_buttons"
            ADD CONSTRAINT "UQ_viewer_buttons_category" UNIQUE ("category");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "viewer_buttons" DROP CONSTRAINT IF EXISTS "UQ_viewer_buttons_category"`,
    );
    await queryRunner.query(`ALTER TABLE "viewer_buttons" ALTER COLUMN "category" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "viewer_buttons" DROP COLUMN IF EXISTS "category"`);
  }
}

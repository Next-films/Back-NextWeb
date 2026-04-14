import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCopiedHorizontalPreview1742700000000 implements MigrationInterface {
  name = 'RemoveCopiedHorizontalPreview1742700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "film"
      SET "horizontalPreviewUrl" = NULL
      WHERE "horizontalPreviewUrl" IS NOT NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("horizontalPreviewUrl") <> ''
        AND btrim("previewUrl") <> ''
        AND "horizontalPreviewUrl" = "previewUrl"
    `);

    await queryRunner.query(`
      UPDATE "cartoon"
      SET "horizontalPreviewUrl" = NULL
      WHERE "horizontalPreviewUrl" IS NOT NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("horizontalPreviewUrl") <> ''
        AND btrim("previewUrl") <> ''
        AND "horizontalPreviewUrl" = "previewUrl"
    `);

    await queryRunner.query(`
      UPDATE "serial"
      SET "horizontalPreviewUrl" = NULL
      WHERE "horizontalPreviewUrl" IS NOT NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("horizontalPreviewUrl") <> ''
        AND btrim("previewUrl") <> ''
        AND "horizontalPreviewUrl" = "previewUrl"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "film"
      SET "horizontalPreviewUrl" = "previewUrl"
      WHERE "horizontalPreviewUrl" IS NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("previewUrl") <> ''
    `);

    await queryRunner.query(`
      UPDATE "cartoon"
      SET "horizontalPreviewUrl" = "previewUrl"
      WHERE "horizontalPreviewUrl" IS NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("previewUrl") <> ''
    `);

    await queryRunner.query(`
      UPDATE "serial"
      SET "horizontalPreviewUrl" = "previewUrl"
      WHERE "horizontalPreviewUrl" IS NULL
        AND "previewUrl" IS NOT NULL
        AND btrim("previewUrl") <> ''
    `);
  }
}

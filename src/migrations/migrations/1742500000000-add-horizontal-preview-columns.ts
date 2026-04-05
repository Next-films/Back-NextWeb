import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHorizontalPreviewColumns1742500000000 implements MigrationInterface {
  name = 'AddHorizontalPreviewColumns1742500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "film" ADD COLUMN IF NOT EXISTS "horizontalPreviewUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "cartoon" ADD COLUMN IF NOT EXISTS "horizontalPreviewUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "serial" ADD COLUMN IF NOT EXISTS "horizontalPreviewUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "serial" DROP COLUMN IF EXISTS "horizontalPreviewUrl"`);
    await queryRunner.query(`ALTER TABLE "cartoon" DROP COLUMN IF EXISTS "horizontalPreviewUrl"`);
    await queryRunner.query(`ALTER TABLE "film" DROP COLUMN IF EXISTS "horizontalPreviewUrl"`);
  }
}

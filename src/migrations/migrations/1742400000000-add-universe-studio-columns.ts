import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniverseStudioColumns1742400000000 implements MigrationInterface {
  name = 'AddUniverseStudioColumns1742400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "film" ADD COLUMN IF NOT EXISTS "universe" character varying COLLATE "ru-RU-x-icu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "film" ADD COLUMN IF NOT EXISTS "studio" character varying COLLATE "ru-RU-x-icu"`,
    );

    await queryRunner.query(
      `ALTER TABLE "cartoon" ADD COLUMN IF NOT EXISTS "universe" character varying COLLATE "ru-RU-x-icu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cartoon" ADD COLUMN IF NOT EXISTS "studio" character varying COLLATE "ru-RU-x-icu"`,
    );

    await queryRunner.query(
      `ALTER TABLE "serial" ADD COLUMN IF NOT EXISTS "universe" character varying COLLATE "ru-RU-x-icu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "serial" ADD COLUMN IF NOT EXISTS "studio" character varying COLLATE "ru-RU-x-icu"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "serial" DROP COLUMN IF EXISTS "studio"`);
    await queryRunner.query(`ALTER TABLE "serial" DROP COLUMN IF EXISTS "universe"`);

    await queryRunner.query(`ALTER TABLE "cartoon" DROP COLUMN IF EXISTS "studio"`);
    await queryRunner.query(`ALTER TABLE "cartoon" DROP COLUMN IF EXISTS "universe"`);

    await queryRunner.query(`ALTER TABLE "film" DROP COLUMN IF EXISTS "studio"`);
    await queryRunner.query(`ALTER TABLE "film" DROP COLUMN IF EXISTS "universe"`);
  }
}

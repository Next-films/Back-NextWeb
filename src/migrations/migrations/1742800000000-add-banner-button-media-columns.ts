import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBannerButtonMediaColumns1742800000000 implements MigrationInterface {
  name = 'AddBannerButtonMediaColumns1742800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "buttonImageUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "buttonHoverVideoUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "banners" DROP COLUMN IF EXISTS "buttonHoverVideoUrl"`);
    await queryRunner.query(`ALTER TABLE "banners" DROP COLUMN IF EXISTS "buttonImageUrl"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYoutubeShortFormat1793300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "admin_youtube_videos" ADD COLUMN "isShort" boolean NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "admin_youtube_videos" DROP COLUMN "isShort"');
  }
}

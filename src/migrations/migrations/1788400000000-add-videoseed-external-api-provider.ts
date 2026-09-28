import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoseedExternalApiProvider1788400000000 implements MigrationInterface {
  name = 'AddVideoseedExternalApiProvider1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."external_api_config_provider_enum"
      ADD VALUE IF NOT EXISTS 'videoseed'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot safely remove an enum value while rows may still use it.
  }
}

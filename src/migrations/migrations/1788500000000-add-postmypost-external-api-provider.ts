import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostmypostExternalApiProvider1788500000000 implements MigrationInterface {
  name = 'AddPostmypostExternalApiProvider1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."external_api_config_provider_enum"
      ADD VALUE IF NOT EXISTS 'postmypost'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot safely remove an enum value while rows may still use it.
  }
}

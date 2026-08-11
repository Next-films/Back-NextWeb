import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveFanartExternalApiProvider1786465000000 implements MigrationInterface {
  name = 'RemoveFanartExternalApiProvider1786465000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "external_api_config"
      WHERE "provider"::text = 'fanart-tv'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."external_api_config_provider_enum"
      RENAME TO "external_api_config_provider_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."external_api_config_provider_enum"
      AS ENUM('kinopoisk', 'tor-api', 'tmdb')
    `);

    await queryRunner.query(`
      ALTER TABLE "external_api_config"
      ALTER COLUMN "provider"
      TYPE "public"."external_api_config_provider_enum"
      USING "provider"::text::"public"."external_api_config_provider_enum"
    `);

    await queryRunner.query(`DROP TYPE "public"."external_api_config_provider_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."external_api_config_provider_enum"
      ADD VALUE IF NOT EXISTS 'fanart-tv'
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieAssetExternalApiProviders1786464000000 implements MigrationInterface {
  name = 'AddMovieAssetExternalApiProviders1786464000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_api_config_provider_enum') THEN
          ALTER TYPE "public"."external_api_config_provider_enum" ADD VALUE IF NOT EXISTS 'tmdb';
          ALTER TYPE "public"."external_api_config_provider_enum" ADD VALUE IF NOT EXISTS 'fanart-tv';
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {}
}

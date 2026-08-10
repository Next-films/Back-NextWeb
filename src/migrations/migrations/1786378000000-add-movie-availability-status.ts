import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieAvailabilityStatus1786378000000 implements MigrationInterface {
  name = 'AddMovieAvailabilityStatus1786378000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movie_availability_status_enum') THEN
          CREATE TYPE "movie_availability_status_enum" AS ENUM (
            'upcoming',
            'released_no_video',
            'available'
          );
        END IF;
      END
      $$;
    `);

    for (const tableName of ['film', 'cartoon', 'serial']) {
      await queryRunner.query(`
        ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS "availabilityStatus" "movie_availability_status_enum" NOT NULL DEFAULT 'available'
      `);

      await queryRunner.query(`
        UPDATE "${tableName}"
        SET "availabilityStatus" =
          CASE
            WHEN "videoUrl" IS NOT NULL AND "videoUrl" <> '' THEN 'available'::"movie_availability_status_enum"
            WHEN "releaseDate" IS NOT NULL AND "releaseDate" > CURRENT_DATE THEN 'upcoming'::"movie_availability_status_enum"
            ELSE 'released_no_video'::"movie_availability_status_enum"
          END
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ['serial', 'cartoon', 'film']) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "availabilityStatus"`,
      );
    }

    await queryRunner.query(`DROP TYPE IF EXISTS "movie_availability_status_enum"`);
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema
		.createTable('series', (t) => {
			t.increments('id').primary();
			t.string('title').notNullable().unique();
			t.string('titleImgUrl');
			t.string('name');
			t.string('subtitle');
			t.string('description');
			t.string('date');
			t.string('backgroundImgUrl');
			t.string('cardImgUrl');
			t.string('trailerUrl');
			t.integer('formatId')
				.unsigned()
				.references('id')
				.inTable('formats')
				.onDelete('CASCADE');
			t.timestamps(true, true);
		})
		.createTable('seasons', (t) => {
			t.increments('id').primary();
			t.integer('seriesId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('series')
				.onDelete('CASCADE');
			t.integer('seasonNumber').unsigned().notNullable();
			t.string('trailerUrl');
			t.timestamps(true, true);
		})
		.createTable('episodes', (t) => {
			t.increments('id').primary();
			t.integer('seasonId')
				.unsigned()
				// .notNullable()
				.references('id')
				.inTable('seasons')
				.onDelete('CASCADE');
			t.integer('seriesId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('series')
				.onDelete('CASCADE');
			t.integer('episodeNumber').unsigned().notNullable();
			t.string('title');
			t.string('trailerUrl');
			t.string('previewUrl');
			t.string('episodeUrl');
			t.string('releaseDate');
			t.timestamps(true, true);
		})
		.createTable('seriesGenres', (t) => {
			t.increments('id').primary();
			t.integer('seriesId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('series')
				.onDelete('CASCADE');
			t.integer('genreId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('genres')
				.onDelete('CASCADE');
		});
	// .createTable('seriesFormats', (t) => {
	// 	t.increments('id').primary();
	// 	t.integer('seriesId')
	// 		.unsigned()
	// 		.notNullable()
	// 		.references('id')
	// 		.inTable('series')
	// 		.onDelete('CASCADE');
	// 	t.integer('formatId')
	// 		.unsigned()
	// 		.notNullable()
	// 		.references('id')
	// 		.inTable('formats')
	// 		.onDelete('CASCADE');
	// });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return (
		knex.schema
			.dropTable('seriesGenres')
			// .dropTable('seriesFormats')
			.dropTable('episodes')
			.dropTable('seasons')
			.dropTable('series')
	);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema
		.createTable('formats', (t) => {
			t.increments('id').primary();
			t.string('format', 255).notNullable().unique();
		})
		.createTable('genres', (t) => {
			t.increments('id').primary();
			t.string('genre', 255).notNullable().unique();
		})
		.createTable('movies', (t) => {
			t.increments('id').primary();
			t.string('title', 255).notNullable();
			t.string('subtitle', 255);
			t.string('name', 255);
			t.string('date', 255);
			t.text('description');
			t.string('titleImgUrl');
			t.string('backgroundImgUrl');
			t.string('cardImgUrl');
			t.string('movieUrl');
			t.string('trailerUrl');
			t.string('ads');
			t.integer('formatId')
				.unsigned()
				.references('id')
				.inTable('formats')
				.onDelete('CASCADE');
			t.timestamps(true, true);
		})
		.createTable('movieGenres', (t) => {
			t.increments('id').primary();
			t.integer('movieId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('movies')
				.onDelete('CASCADE');
			t.integer('genreId')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('genres')
				.onDelete('CASCADE');
		});
	// .createTable('movieFormats', (t) => {
	// 	t.increments('id').primary();
	// 	t.integer('movieId')
	// 		.unsigned()
	// 		.notNullable()
	// 		.references('id')
	// 		.inTable('movies')
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
			// .dropTable('movieFormats')
			.dropTable('movieGenres')
			.dropTable('movies')
			.dropTable('genres')
			.dropTable('formats')
	);
};

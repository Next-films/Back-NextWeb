/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable('users', (t) => {
		t.increments('id').primary();
		t.string('email').notNullable().unique();
		t.string('password').notNullable();
		t.string('salt').notNullable();
		t.string('login').notNullable().unique();
		t.string('role').notNullable().defaultTo('user');
		t.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return (
		knex.schema
			// .dropTableIfExists('userRoles')
			// .dropTableIfExists('roles')
			.dropTableIfExists('users')
	);
};

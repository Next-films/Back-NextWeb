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
	// .createTable('roles', (t) => {
	// 	t.increments('id').primary();
	// 	t.string('name').notNullable().unique();
	// 	t.string('description');
	// })
	// .createTable('userRoles', (t) => {
	// 	t.increments('id').primary();
	// 	t.integer('userId')
	// 		.unsigned()
	// 		.notNullable()
	// 		.references('id')
	// 		.inTable('users')
	// 		.onDelete('CASCADE');
	// 	t.integer('roleId')
	// 		.unsigned()
	// 		.notNullable()
	// 		.references('id')
	// 		.inTable('roles')
	// 		.onDelete('CASCADE');
	// 	t.unique(['userId', 'roleId']);
	// })
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

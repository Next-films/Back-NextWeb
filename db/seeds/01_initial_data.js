/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// await knex('userRoles').del();
	// await knex('roles').del();
	await knex('users').del();

	await knex('users').insert([
		{
			email: 'admin@example.com',
			password: 'hashed',
			salt: 'defaultSalt',
			login: 'admin',
			role: 'admin',
		},
		{
			email: 'user@example.com',
			password: 'hashed',
			salt: 'defaultUserSalt',
			login: 'user1',
			role: 'user',
		},
	]);

	// await knex('roles').insert([
	// 	{
	// 		name: 'admin',
	// 		description: 'Администратор системы',
	// 	},
	// 	{
	// 		name: 'user',
	// 		description: 'Обычный пользователь',
	// 	},
	// ]);

	// const users = await knex('users').select('id', 'login');
	// const roles = await knex('roles').select('id', 'name');
	// await knex('userRoles').insert([
	// 	{
	// 		userId: users.find((user) => user.login === 'admin').id,
	// 		roleId: roles.find((role) => role.name === 'admin').id,
	// 	},
	// 	{
	// 		userId: users.find((user) => user.login === 'user').id,
	// 		roleId: roles.find((role) => role.name === 'user').id,
	// 	},
	// ]);
};

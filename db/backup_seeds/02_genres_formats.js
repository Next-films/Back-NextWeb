/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Deletes ALL existing entries
	// await knex('formats').del();
	// await knex('genres').del();
	// await knex('formats').insert([
	// 	{ format: 'films' },
	// 	{ format: 'cartoons' },
	// 	{ format: 'series' },
	// ]);
	// await knex('genres').insert([
	// 	{ genre: 'Триллер' },
	// 	{ genre: 'Детектив' },
	// 	{ genre: 'Военный' },
	// 	{ genre: 'Боевик' },
	// 	{ genre: 'Фантастика' },
	// 	{ genre: 'Исторический фильм' },
	// 	{ genre: 'Криминал' },
	// 	{ genre: 'Комедия' },
	// 	{ genre: 'Драма' },
	// 	{ genre: 'Фэнтези' },
	// 	{ genre: 'Приключения' },
	// 	{ genre: 'Ужасы' },
	// 	{ genre: 'Мелодрама' },
	// 	{ genre: 'Спорт' },
	// ]);
};

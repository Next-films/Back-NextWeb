const { readFile } = require('node:fs/promises');
const { URL } = require('node:url');
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	await knex('movies').del();
	await knex('genres').del();
	await knex('formats').del();
	const rawCommonMovies = await readFile('db/mocks/commonMovies.json').then(
		(data) => JSON.parse(data)
	);

	const genreSet = new Set();
	const formatSet = new Set();

	const parsedCommonMovies = rawCommonMovies.map((movie) => {
		movie.filtr.forEach((f) => genreSet.add(f));
		formatSet.add(movie.type);
		return {
			title: movie.title,
			subtitle: movie.subTitle,
			name: movie.name,
			date: movie.date,
			description: movie.description,
			titleImgUrl: new URL(movie.titleImg).pathname,
			backgroundImgUrl: new URL(movie.backgroundImg).pathname,
			cardImgUrl: new URL(movie.cardImg).pathname,
			movieUrl: new URL(movie.films).pathname,
			trailerUrl: new URL(movie.trailer).pathname,
			formatId: movie.type,
		};
	});

	await knex('formats').insert(
		Array.from(formatSet).map((f) => ({ format: f }))
	);
	await knex('genres').insert(Array.from(genreSet).map((g) => ({ genre: g })));

	const formatRows = await knex('formats').select();

	const formatDict = formatRows.reduce((dict, row) => {
		dict[row.format] = row.id;
		return dict;
	}, {});
	const readyCommonMovies = parsedCommonMovies.map((pcm) => {
		pcm.formatId = formatDict[pcm.formatId];
		return pcm;
	});
	await knex('movies').insert(readyCommonMovies);

	// await knex('movieFormats').del();
	await knex('movieGenres').del();

	const movieRows = await knex('movies').select();
	const genreRows = await knex('genres').select();

	const genresDict = genreRows.reduce((dict, row) => {
		dict[row.genre] = row.id;
		return dict;
	}, {});

	const genreItems = rawCommonMovies.flatMap((rcm) => {
		return rcm.filtr.map((g) => ({
			movieId: movieRows.find((m) => m.title === rcm.title).id,
			genreId: genresDict[g],
		}));
	});

	// const formatItems = rawCommonMovies.map((rcm) => {
	// 	const movie = movieRows.find((m) => m.title === rcm.title);

	// 	return {
	// 		movieId: movie.id,
	// 		formatId: formatDict[rcm.type],
	// 	};
	// });

	await knex('movieGenres').insert(genreItems);
	// await knex('movieFormats').insert(formatItems);
};

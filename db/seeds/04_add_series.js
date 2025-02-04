const { readFile } = require('node:fs/promises');
const { URL } = require('node:url');
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Deletes ALL existing entries
	await knex('series').del();
	await knex('seasons').del();
	await knex('episodes').del();
	await knex('seriesGenres').del();
	// await knex('seriesFormats').del();

	const rawSeries = await readFile('db/mocks/Serials.json').then((data) =>
		JSON.parse(data)
	);

	await knex('formats').insert([{ format: 'series' }]);
	const { 0: currentFormat } = await knex('formats')
		.select('id', 'format')
		.where('format', 'series');

	const parsedSeries = rawSeries.map((ser) => {
		return {
			title: ser.title,
			titleImgUrl: ser.titleImg,
			subtitle: ser.subTitle,
			name: ser.name,
			description: ser.description,
			date: ser.date,
			backgroundImgUrl: new URL(ser.backgroundImg).pathname,
			cardImgUrl: new URL(ser.cardImg).pathname,
			trailerUrl: new URL(ser.trailer).pathname,
			formatId: currentFormat.id,
		};
	});
	await knex('series').insert(parsedSeries);

	await knex('seriesGenres').del();
	// await knex('seriesFormats').del();

	const seriesRows = await knex('series').select();
	const genreRows = await knex('genres').select();

	const genresDict = genreRows.reduce((dict, row) => {
		dict[row.genre] = row.id;
		return dict;
	}, {});

	const genreItems = rawSeries.flatMap((rs) => {
		return rs.filtr.map((g) => ({
			seriesId: seriesRows.find((s) => s.title === rs.title).id,
			genreId: genresDict[g],
		}));
	});

	const parsedEpisodes = rawSeries.flatMap((rs) => {
		const currentSRow = seriesRows.find((srow) => srow.title === rs.title);
		return rs.films.map((film, i) => ({
			seriesId: currentSRow.id,
			episodeUrl: new URL(film.videoUrl).pathname,
			episodeNumber: i,
			previewUrl: new URL(film.previewUrl).pathname,
		}));
	});

	await knex('episodes').insert(parsedEpisodes);
	await knex('seriesGenres').insert(genreItems);
	// await knex('seriesFormats').insert(formatItems);
};

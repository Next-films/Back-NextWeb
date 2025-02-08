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
	const seriesSet = new Set();

	const parsedSeries = rawSeries
		.filter((ser) => {
			if (seriesSet.has(ser.title)) {
				return false;
			}
			seriesSet.add(ser.title);
			return true;
		})
		.map((ser) => {
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

	const parsedSeasons = rawSeries.map((rs) => ({
		seriesId: seriesRows.find((s) => s.title === rs.title).id,
		seasonNumber: rs.season,
	}));

	await knex('seasons').insert(parsedSeasons);
	const seasons = await knex('seasons').select();
	const seasonDict = seasons.reduce((dict, row) => {
		if (Object.hasOwn(dict, row.seriesId)) {
			dict[row.seriesId][row.seasonNumber] = row.id;
		} else {
			dict[row.seriesId] = { [row.seasonNumber]: row.id };
		}
		return dict;
	}, {});

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
			seasonId: seasonDict[currentSRow.id][rs.season],
			episodeUrl: new URL(film.videoUrl).pathname,
			episodeNumber: i,
			previewUrl: new URL(film.previewUrl).pathname,
		}));
	});

	await knex('episodes').insert(parsedEpisodes);
	await knex('seriesGenres').insert(genreItems);
	// await knex('seriesFormats').insert(formatItems);
};

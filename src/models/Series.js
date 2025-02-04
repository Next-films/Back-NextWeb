const Model = require('./index');

const Format = require('./Format');
const SeriesGenre = require('./SeriesGenre');
const Episode = require('./Episode');
// const Genre = require('./Genre');

class Series extends Model {
	static get tableName() {
		return 'series';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			genres: {
				relation: Model.ManyToManyRelation,
				modelClass: require('./Genre'),
				join: {
					from: 'series.id',
					through: {
						from: 'seriesGenres.seriesId',
						to: 'seriesGenres.genreId',
					},
					to: 'genres.id',
				},
			},

			seriesGenres: {
				relation: Model.HasManyRelation,
				modelClass: SeriesGenre,
				join: {
					from: 'series.id',
					to: 'seriesGenres.seriesId',
				},
			},
			formats: {
				relation: Model.BelongsToOneRelation,
				modelClass: Format,
				join: {
					from: 'series.formatId',
					to: 'formats.id',
				},
			},
			// seriesFormats: {
			// 	relation: Model.HasManyRelation,
			// 	modelClass: SeriesFormat,
			// 	join: {
			// 		from: 'series.id',
			// 		to: 'seriesFormats.seriesId',
			// 	},
			// },
			episodes: {
				relation: Model.HasManyRelation,
				modelClass: Episode,
				join: {
					from: 'series.id',
					to: 'episodes.seriesId',
				},
			},
		};
	}
}

module.exports = Series;

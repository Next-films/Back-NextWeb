const Model = require('./index');
// const MovieFormat = require('./MovieFormat');
// const Movie = require('./Movie');
// const Series = require('./Series');

class Format extends Model {
	static get tableName() {
		return 'formats';
	}
	static get idColumn() {
		return 'id';
	}
	// static get relationMappings() {
	// 	return {
	// 		movies: {
	// 			relation: Model.ManyToManyRelation,
	// 			modelClass: Movie,
	// 			join: {
	// 				from: 'formats.id',
	// 				through: {
	// 					from: 'movieFormats.formatId',
	// 					to: 'movieFormats.movieId',
	// 				},
	// 				to: 'movies.id',
	// 			},
	// 		},
	// 		series: {
	// 			relation: Model.ManyToManyRelation,
	// 			modelClass: Series,
	// 			join: {
	// 				from: 'formats.id',
	// 				through: {
	// 					from: 'seriesFormats.formatId',
	// 					to: 'seriesFormats.seriesId',
	// 				},
	// 				to: 'series.id',
	// 			},
	// 		},

	// 		seriesFormats: {
	// 			relation: Model.HasManyRelation,
	// 			modelClass: SeriesFormat,
	// 			join: {
	// 				from: 'formats.id',
	// 				to: 'seriesFormats.formatId',
	// 			},
	// 		},
	// 	};
	// }
}

module.exports = Format;

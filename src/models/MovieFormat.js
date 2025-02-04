// const Model = require('./index');
// const Movie = require('./Movie');
// const Format = require('./Format');
// class MovieFormat extends Model {
// 	static get tableName() {
// 		return 'movieFormats';
// 	}
// 	static get idColumn() {
// 		return 'id';
// 	}
// 	static get relationMappings() {
// 		return {
// 			movies: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: Movie,
// 				join: {
// 					from: 'movieFormats.movieId',
// 					to: 'movies.id',
// 				},
// 			},
// 			formats: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: Format,
// 				join: {
// 					from: 'movieFormats.formatId',
// 					to: 'formats.id',
// 				},
// 			},
// 		};
// 	}
// }

// module.exports = MovieFormat;

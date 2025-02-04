// const Model = require('./index');
// const Series = require('./Series');
// const Format = require('./Format');
// class SeriesFormat extends Model {
// 	static get tableName() {
// 		return 'seriesFormats';
// 	}
// 	static get idColumn() {
// 		return 'id';
// 	}
// 	static get relationMappings() {
// 		return {
// 			series: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: Series,
// 				join: {
// 					from: 'seriesFormats.seriesId',
// 					to: 'series.id',
// 				},
// 			},
// 			formats: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: Format,
// 				join: {
// 					from: 'seriesFormats.formatId',
// 					to: 'formats.id',
// 				},
// 			},
// 		};
// 	}
// }

// module.exports = SeriesFormat;

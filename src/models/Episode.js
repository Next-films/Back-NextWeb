const Model = require('./index');
const Series = require('./Series');

class Episode extends Model {
	static get tableName() {
		return 'episodes';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			series: {
				relation: Model.BelongsToOneRelation,
				modelClass: Series,
				join: {
					from: 'episodes.seriesId',
					to: 'series.id',
				},
			},
			seasons: {
				relation: Model.BelongsToOneRelation,
				modelClass: require('./Season'),
				join: {
					from: 'episodes.seasonId',
					to: 'seasons.id',
				},
			},
		};
	}
}

module.exports = Episode;

const Model = require('./index');
// const Episode = require('./Episode');
class Season extends Model {
	static get tableName() {
		return 'seasons';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			episodes: {
				relation: Model.HasManyRelation,
				modelClass: require('./Episode'),
				join: {
					from: 'seasons.id',
					to: 'episodes.seasonId',
				},
			},
			series: {
				relation: Model.BelongsToOneRelation,
				modelClass: require('./Series'),
				join: {
					from: 'seasons.seriesId',
					to: 'series.id',
				},
			},
		};
	}
}

module.exports = Season;

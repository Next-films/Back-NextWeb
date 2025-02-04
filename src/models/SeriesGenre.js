const Model = require('./index');
const Genre = require('./Genre');
const Series = require('./Series');
class SeriesGenre extends Model {
	static get tableName() {
		return 'seriesGenres';
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
					from: 'seriesGenres.seriesId',
					to: 'series.id',
				},
			},
			genres: {
				relation: Model.BelongsToOneRelation,
				modelClass: Genre,
				join: {
					from: 'seriesGenres.genreId',
					to: 'genres.id',
				},
			},
		};
	}
}

module.exports = SeriesGenre;

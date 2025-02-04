const Model = require('./index');
const Movie = require('./Movie');
const Genre = require('./Genre');
class MovieGenre extends Model {
	static get tableName() {
		return 'movieGenres';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			movies: {
				relation: Model.BelongsToOneRelation,
				modelClass: Movie,
				join: {
					from: 'movieGenres.movieId',
					to: 'movies.id',
				},
			},
			genres: {
				relation: Model.BelongsToOneRelation,
				modelClass: Genre,
				join: {
					from: 'movieGenres.genreId',
					to: 'genres.id',
				},
			},
		};
	}
}

module.exports = MovieGenre;

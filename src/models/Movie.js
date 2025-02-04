const Model = require('./index');
const Genre = require('./Genre');
const Format = require('./Format');
const MovieGenre = require('./MovieGenre');

class Movie extends Model {
	static get tableName() {
		return 'movies';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			genres: {
				relation: Model.ManyToManyRelation,
				modelClass: Genre,
				join: {
					from: 'movies.id',
					through: {
						from: 'movieGenres.movieId',
						to: 'movieGenres.genreId',
					},
					to: 'genres.id',
				},
			},
			movieGenres: {
				relation: Model.HasManyRelation,
				modelClass: MovieGenre,
				join: {
					from: 'movies.id',
					to: 'movieGenres.movieId',
				},
			},

			formats: {
				relation: Model.BelongsToOneRelation,
				modelClass: Format,
				join: {
					from: 'movies.formatId',
					to: 'formats.id',
				},
			},
		};
	}
}

module.exports = Movie;
